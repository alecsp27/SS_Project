#!/bin/bash

# === Configuration ===
CERT_DIR="./certs"
CONFIG_FILE="openssl-san.cnf"
DAYS=3650
PASSWORD="password123"  # 🔐 Password for the client.p12 file used on Android
SERVER_CN="localhost"
CLIENT_CN="mqtt-client"
SAN_IP="127.0.0.1"
SAN_DOCKER_BRIDGE="172.17.0.1"
SAN_EXTRA="host.docker.internal"

ANDROID_RES_RAW_PATH="../app/src/main/res/raw"  # <-- Adjust if needed
FORCE_REGEN=false
if [[ "$1" == "--force" ]]; then
  FORCE_REGEN=true
  echo "⚠️  Force regeneration enabled — all certs will be deleted and recreated."
fi

# === Prepare Working Directory ===
mkdir -p "$CERT_DIR"
cd "$CERT_DIR" || exit 1

# === Cleanup Old Files if --force is passed ===
if [ "$FORCE_REGEN" = true ]; then
  echo "🧹 Cleaning up old certs in $CERT_DIR..."
  rm -f *.crt *.csr *.key *.srl *.p12 "$CONFIG_FILE"
fi

echo "📁 Working in: $CERT_DIR"

# === 1. Certificate Authority (CA) ===
if [[ ! -f ca.key || ! -f ca.crt ]]; then
  echo "🔐 [1/6] Generating CA..."
  openssl genrsa -out ca.key 2048
  openssl req -x509 -new -nodes -key ca.key -sha256 -days $DAYS -out ca.crt -subj "/CN=MyMQTTCA"
else
  echo "✅ CA already exists. Skipping."
fi

# === 2. Server Key ===
if [[ ! -f server.key ]]; then
  echo "🔐 [2/6] Generating Server Key..."
  openssl genrsa -out server.key 2048
fi

# === 3. Server CSR ===
echo "📄 [3/6] Creating Server CSR..."
openssl req -new -key server.key -out server.csr -subj "/CN=$SERVER_CN"

# === 4. SAN Config and Server Certificate ===
echo "✍️  Creating $CONFIG_FILE with SAN entries..."
cat > "$CONFIG_FILE" <<EOF
[ req ]
default_bits       = 2048
prompt             = no
default_md         = sha256
req_extensions     = req_ext
distinguished_name = dn

[ dn ]
CN = $SERVER_CN

[ req_ext ]
subjectAltName = @alt_names

[ alt_names ]
DNS.1 = $SERVER_CN
DNS.2 = mosquitto
DNS.3 = $SAN_EXTRA
DNS.4 = localhost
IP.1 = $SAN_IP
IP.2 = $SAN_DOCKER_BRIDGE
IP.3 = 10.0.2.2
EOF

echo "🔐 [4/6] Signing Server Certificate with SAN..."
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
  -out server.crt -days $DAYS -sha256 -extfile "$CONFIG_FILE" -extensions req_ext

# === 5. Client Certificate ===
echo "🔐 [5/6] Generating Client Certificate..."
openssl genrsa -out client.key 2048
openssl req -new -key client.key -out client.csr -subj "/CN=$CLIENT_CN"
openssl x509 -req -in client.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
  -out client.crt -days $DAYS -sha256

# === 6. Create .p12 Bundle for Android ===
echo "📦 [6/6] Exporting client.p12 for Android..."
openssl pkcs12 -export \
  -in client.crt \
  -inkey client.key \
  -certfile ca.crt \
  -out client.p12 \
  -name "$CLIENT_CN" \
  -passout pass:$PASSWORD

chmod 644 client.p12

# === Step 2: Ensure Android path exists and copy client.p12 ===
echo ""
echo "📁 Checking Android path: $ANDROID_RES_RAW_PATH"
mkdir -p "$ANDROID_RES_RAW_PATH"

if [ -d "$ANDROID_RES_RAW_PATH" ]; then
  cp -f client.p12 "$ANDROID_RES_RAW_PATH/client.p12"
  echo "✅ client.p12 copied to $ANDROID_RES_RAW_PATH/"
else
  echo "❌ Failed to create $ANDROID_RES_RAW_PATH"
fi

# === Final Output ===
echo ""
echo "✅ All certificates generated successfully!"
echo "📦 client.p12 password: $PASSWORD"
ls -l client.*

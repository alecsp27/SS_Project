#!/bin/bash

CERT_DIR="./certs"
CONFIG_FILE="openssl-san.cnf"
DAYS=3650
PASSWORD="your_password"
SERVER_CN="localhost"
CLIENT_CN="mqtt-client"
SAN_IP="127.0.0.1"
SAN_DOCKER_BRIDGE="172.17.0.1"
SAN_EXTRA="host.docker.internal"

FORCE_REGEN=false
if [[ "$1" == "--force" ]]; then
  FORCE_REGEN=true
  echo "⚠️ Force regeneration enabled — all certs will be deleted and recreated."
fi

mkdir -p "$CERT_DIR"
cd "$CERT_DIR" || exit

# Cleanup if forced
if [ "$FORCE_REGEN" = true ]; then
  echo "🧹 Cleaning up old certs in $CERT_DIR..."
  rm -f *.crt *.csr *.key *.srl *.p12 "$CONFIG_FILE"
fi

echo "📁 Working in: $CERT_DIR"

# 1. CA
if [[ ! -f ca.key || ! -f ca.crt ]]; then
  echo "🔐 [1/6] Generating CA..."
  openssl genrsa -out ca.key 2048
  openssl req -x509 -new -nodes -key ca.key -sha256 -days $DAYS -out ca.crt -subj "/CN=MyMQTTCA"
else
  echo "✅ CA already exists. Skipping."
fi

# 2. Server key + CSR
if [[ ! -f server.key ]]; then
  echo "🔐 [2/6] Generating Server Key + CSR..."
  openssl genrsa -out server.key 2048
fi

echo "📄 Creating server CSR..."
openssl req -new -key server.key -out server.csr -subj "/CN=$SERVER_CN"

# 3. SAN config
echo "✍️ [3/6] Creating $CONFIG_FILE with SAN..."
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
DNS.2 = $SAN_EXTRA
IP.1 = $SAN_IP
IP.2 = $SAN_DOCKER_BRIDGE
EOF

# 4. Server cert
echo "🔐 [4/6] Signing Server Cert with SAN..."
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
-out server.crt -days $DAYS -sha256 -extfile "$CONFIG_FILE" -extensions req_ext

# 5. Client cert
echo "🔐 [5/6] Generating Client Cert..."
openssl genrsa -out client.key 2048
openssl req -new -key client.key -out client.csr -subj "/CN=$CLIENT_CN"
openssl x509 -req -in client.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
-out client.crt -days $DAYS -sha256

# 6. Android P12
echo "📦 [6/6] Exporting client.p12 for Android..."
openssl pkcs12 -export \
  -in client.crt \
  -inkey client.key \
  -certfile ca.crt \
  -out client.p12 \
  -name "$CLIENT_CN" \
  -passout pass:$PASSWORD

echo "✅ Done!"
ls -l

#!/bin/bash

CERT_DIR="./certs"
DAYS=3650
PASSWORD="your_password"

echo "🧹 Cleaning up old certs in $CERT_DIR..."
rm -f "$CERT_DIR"/*.crt "$CERT_DIR"/*.csr "$CERT_DIR"/*.key "$CERT_DIR"/*.srl "$CERT_DIR"/*.p12

mkdir -p "$CERT_DIR"
cd "$CERT_DIR" || exit


echo "📁 Working in: $CERT_DIR"

echo "🔐 [1/6] Generating CA..."
openssl genrsa -out ca.key 2048
openssl req -x509 -new -nodes -key ca.key -sha256 -days $DAYS -out ca.crt -subj "/CN=MyMQTTCA"

echo "🔐 [2/6] Generating Server Key + CSR..."
openssl genrsa -out server.key 2048
openssl req -new -key server.key -out server.csr -subj "/CN=localhost"

echo "✍️ [3/6] Creating openssl-san.cnf..."
cat > ../openssl-san.cnf <<EOF
[ req ]
default_bits       = 2048
prompt             = no
default_md         = sha256
req_extensions     = req_ext
distinguished_name = dn

[ dn ]
CN = localhost

[ req_ext ]
subjectAltName = @alt_names

[ alt_names ]
DNS.1 = localhost
IP.1 = 127.0.0.1
IP.2 = 172.17.0.1
EOF

echo "🔐 [4/6] Signing Server Cert with SAN..."
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
-out server.crt -days $DAYS -sha256 -extfile ../openssl-san.cnf -extensions req_ext

echo "🔐 [5/6] Generating Client Cert..."
openssl genrsa -out client.key 2048
openssl req -new -key client.key -out client.csr -subj "/CN=mqtt-client"
openssl x509 -req -in client.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
-out client.crt -days $DAYS -sha256

echo "📦 [6/6] Exporting client.p12 for Android..."
openssl pkcs12 -export \
  -in client.crt \
  -inkey client.key \
  -certfile ca.crt \
  -out client.p12 \
  -name "mqtt-client" \
  -passout pass:$PASSWORD

echo "✅ Done!"
ls -l

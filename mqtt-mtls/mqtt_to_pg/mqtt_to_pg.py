import os
import ssl
import json
import base64
import time
import traceback
import tempfile
import psycopg2
import paho.mqtt.client as mqtt
from psycopg2 import OperationalError
from datetime import datetime
from cryptography.hazmat.primitives.serialization import pkcs12, Encoding, PrivateFormat, NoEncryption
from cryptography.hazmat.backends import default_backend

# === Config ===
BROKER = os.environ.get("MQTT_BROKER", "mosquitto")
PORT = 8883
TOPIC = os.environ.get("MQTT_TOPIC", "test/topic/image")
CA_FILE = os.environ.get("CA_CERT_PATH", "/app/certs/ca.crt")
P12_FILE = os.environ.get("P12_PATH", "/app/certs/client.p12")
P12_PASSWORD = os.environ.get("P12_PASSWORD", "password123")

PG_HOST = os.environ.get("PG_HOST", "postgres")
PG_DB   = os.environ.get("PG_DB", "mqttdb")
PG_USER = os.environ.get("PG_USER", "mqttuser")
PG_PASS = os.environ.get("PG_PASS", "mqttpass")

# === Load P12 ===
print("🔧 Loading .p12 certificate using cryptography...", flush=True)
with open(P12_FILE, 'rb') as f:
    p12_data = f.read()
private_key, certificate, _ = pkcs12.load_key_and_certificates(
    p12_data, P12_PASSWORD.encode(), backend=default_backend()
)
cert_file = tempfile.NamedTemporaryFile(delete=False, suffix=".crt")
key_file = tempfile.NamedTemporaryFile(delete=False, suffix=".key")
cert_file.write(certificate.public_bytes(Encoding.PEM))
cert_file.close()
key_file.write(private_key.private_bytes(
    Encoding.PEM, PrivateFormat.TraditionalOpenSSL, NoEncryption()
))
key_file.close()
print(f"✅ Cert: {cert_file.name}", flush=True)
print(f"✅ Key:  {key_file.name}", flush=True)

# === PostgreSQL Connection ===
conn = None
for attempt in range(10):
    try:
        conn = psycopg2.connect(
            host=PG_HOST, database=PG_DB, user=PG_USER, password=PG_PASS
        )
        conn.autocommit = True
        print("✅ Connected to PostgreSQL!", flush=True)
        break
    except OperationalError:
        print(f"❌ PostgreSQL not ready. Retrying in 3s... (attempt {attempt+1}/10)", flush=True)
        time.sleep(3)
else:
    raise Exception("❌ Could not connect to PostgreSQL after 10 attempts")

# Ensure table exists
with conn.cursor() as cur:
    cur.execute("""
        CREATE TABLE IF NOT EXISTS image_messages (
            id SERIAL PRIMARY KEY,
            topic TEXT,
            image BYTEA,
            width INTEGER,
            height INTEGER,
            timestamp TIMESTAMP
        )
    """)

# === MQTT Setup ===
client = mqtt.Client()
client.on_connect = lambda c, u, f, rc: print(f"📶 on_connect() triggered with rc={rc}", flush=True) or (
    c.subscribe(TOPIC) if rc == 0 else print(f"❌ MQTT connection failed with code {rc}", flush=True)
)
client.on_message = lambda c, u, msg: (
    print(f"\n📥 Message received on {msg.topic} at {datetime.utcnow()}", flush=True),
    process_message(msg)
)

client.tls_set(
    ca_certs=CA_FILE,
    certfile=cert_file.name,
    keyfile=key_file.name,
    tls_version=ssl.PROTOCOL_TLS
)

def process_message(msg):
    try:
        data = json.loads(msg.payload.decode("utf-8"))
        image_base64 = data["image_base64"]
        width = int(data["width"])
        height = int(data["height"])
        image_bytes = base64.b64decode(image_base64)
        print(f"📸 Decoded image: {len(image_bytes)} bytes, WxH: {width}x{height}", flush=True)

        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO image_messages (topic, image, width, height, timestamp)
                VALUES (%s, %s, %s, %s, %s)
            """, (msg.topic, psycopg2.Binary(image_bytes), width, height, datetime.utcnow()))
        print("💾 Image saved to PostgreSQL.", flush=True)
    except Exception as e:
        print(f"❌ Error processing message: {e}", flush=True)
        traceback.print_exc()

# === Start MQTT Client ===
print(f"🔌 Connecting to {BROKER}:{PORT} ...", flush=True)
client.connect(BROKER, PORT)
print("✅ connect() called", flush=True)
client.loop_start()
print("🌀 loop_start() called", flush=True)

# === Run forever ===
try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    print("\n🛑 Interrupted. Shutting down...", flush=True)

# === Cleanup ===
client.loop_stop()
client.disconnect()
if conn:
    conn.close()
os.unlink(cert_file.name)
os.unlink(key_file.name)
print("✅ Clean shutdown complete.", flush=True)

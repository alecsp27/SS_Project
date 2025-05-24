import os
import ssl
import json
import base64
import time
import traceback
import paho.mqtt.client as mqtt
import psycopg2
from psycopg2 import OperationalError
from datetime import datetime
from threading import Thread

# --- Configuration ---

# MQTT Settings
BROKER = os.environ.get("MQTT_BROKER", "mosquitto")
PORT = 8883
TOPIC = "test/topic/image"
CA = "/app/certs/ca.crt"
CERT = "/app/certs/client.crt"
KEY = "/app/certs/client.key"

# PostgreSQL Settings
PG_HOST = os.environ.get("PG_HOST", "postgres")
PG_DB = os.environ.get("PG_DB", "mqttdb")
PG_USER = os.environ.get("PG_USER", "mqttuser")
PG_PASS = os.environ.get("PG_PASS", "mqttpass")

# --- PostgreSQL Connection Setup ---
conn = None
for attempt in range(10):
    try:
        conn = psycopg2.connect(
            host=PG_HOST, database=PG_DB, user=PG_USER, password=PG_PASS
        )
        conn.autocommit = True
        print("✅ Connected to PostgreSQL!")
        break
    except OperationalError:
        print(f"❌ PostgreSQL not ready. Retrying in 3s... (attempt {attempt+1}/10)")
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

# --- MQTT Callbacks ---

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("✅ Connected to MQTT Broker")
        client.subscribe(TOPIC)
        print(f"📡 Subscribed to: {TOPIC}")
    else:
        print(f"❌ MQTT connection failed with code {rc}")

def on_message(client, userdata, msg):
    timestamp = datetime.utcnow()
    print(f"\n📥 Received message from {msg.topic} at {timestamp}")

    try:
        data = json.loads(msg.payload.decode("utf-8"))
        image_base64 = data["image_base64"]
        width = int(data["width"])
        height = int(data["height"])
        image_bytes = base64.b64decode(image_base64)  # decode first
        print(f"📸 Image decoded: {len(image_bytes)} bytes, WxH: {width}x{height}")

        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO image_messages (topic, image, width, height, timestamp)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (msg.topic, psycopg2.Binary(image_bytes), width, height, timestamp)
            )
        print("💾 Image saved to PostgreSQL.")
    except Exception as e:
        print(f"❌ Error processing message: {e}")
        traceback.print_exc()

# --- MQTT Client Setup ---
client = mqtt.Client()
client.tls_set(ca_certs=CA, certfile=CERT, keyfile=KEY, tls_version=ssl.PROTOCOL_TLS)
client.on_connect = on_connect
client.on_message = on_message

print("🔌 Connecting to MQTT broker...")
client.connect(BROKER, PORT, keepalive=60)
client.loop_start()

# --- User Publisher Thread ---
def user_input_loop():
    while True:
        user = input("\n📤 Press Enter to publish a sample image or type 'exit': ").strip()
        if user.lower() == "exit":
            break

        # Simulate an image (base64 encoded string of dummy bytes)
        fake_image = base64.b64encode(b"test_image_data").decode("utf-8")
        width, height = 100, 50
        payload = {
            "image_base64": fake_image,
            "width": width,
            "height": height
        }

        client.publish(TOPIC, json.dumps(payload))
        print("📨 Published test image message")

    print("👋 Exiting input thread...")

# Run user input in separate thread
Thread(target=user_input_loop, daemon=True).start()

# Keep main thread alive
try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    print("\n🛑 Interrupted by user. Shutting down...")

# Clean exit
client.loop_stop()
client.disconnect()
if conn:
    conn.close()
print("✅ Clean shutdown complete.")

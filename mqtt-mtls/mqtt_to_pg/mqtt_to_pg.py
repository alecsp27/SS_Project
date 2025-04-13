import os
import time
import json
import base64
import traceback
import paho.mqtt.client as mqtt
import psycopg2
from psycopg2 import OperationalError
from datetime import datetime

# MQTT Config
BROKER = os.environ.get("MQTT_BROKER", "mosquitto")
PORT = 8883
TOPIC = "test/topic/image"
CA = "/app/certs/ca.crt"
CERT = "/app/certs/client.crt"
KEY = "/app/certs/client.key"

# PostgreSQL Config
PG_HOST = os.environ.get("PG_HOST", "postgres")
PG_DB = os.environ.get("PG_DB", "mqttdb")
PG_USER = os.environ.get("PG_USER", "mqttuser")
PG_PASS = os.environ.get("PG_PASS", "mqttpass")

# Retry connection to PostgreSQL
conn = None
for attempt in range(10):
    try:
        conn = psycopg2.connect(
            host=PG_HOST, database=PG_DB, user=PG_USER, password=PG_PASS
        )
        conn.autocommit = True  # Optional: enable auto-commit
        print("✅ Connected to PostgreSQL!")
        break
    except OperationalError:
        print(f"❌ PostgreSQL not ready. Retrying in 3s... (attempt {attempt+1}/10)")
        time.sleep(3)
else:
    raise Exception("❌ Could not connect to PostgreSQL after 10 attempts")

# Create table if not exists
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

# MQTT Callbacks
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("✅ MQTT connected successfully.")
        client.subscribe(TOPIC)
        print(f"📡 Subscribed to topic: {TOPIC}")
    else:
        print(f"❌ MQTT failed to connect, return code {rc}")

def on_message(client, userdata, msg):
    timestamp = datetime.utcnow()
    print(f"📥 Message received from {msg.topic} at {timestamp}")

    try:
        # Decode JSON payload
        payload_str = msg.payload.decode("utf-8")
        data = json.loads(payload_str)
        print("📦 Decoded JSON:", data)



        # Extract and decode image
        image_base64 = data["image_base64"]
        width = int(data["width"])
        height = int(data["height"])

        print(f"📸 Image decoded: {len(image_bytes)} bytes, WxH: {width}x{height}")

        # Insert into PostgreSQL
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO image_messages (topic, image, width, height, timestamp)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (msg.topic, psycopg2.Binary(image_bytes), width, height, timestamp)
            )
        print("💾 Image saved to database.")

    except Exception as e:
        print(f"❌ Failed to process message: {e}")
        traceback.print_exc()

# Set up MQTT client with mTLS
client = mqtt.Client()
client.tls_set(ca_certs=CA, certfile=CERT, keyfile=KEY)
client.on_connect = on_connect
client.on_message = on_message

# Connect and loop
client.connect(BROKER, PORT, 60)
client.loop_forever()

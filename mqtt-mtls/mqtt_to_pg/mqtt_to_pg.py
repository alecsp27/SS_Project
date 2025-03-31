import os
import time
import paho.mqtt.client as mqtt
import psycopg2
from psycopg2 import OperationalError
from datetime import datetime

# MQTT Config
BROKER = os.environ.get("MQTT_BROKER", "mosquitto")
PORT = 8883
TOPIC = "camera/image"
CA = "/app/certs/ca.crt"
CERT = "/app/certs/client.crt"
KEY = "/app/certs/client.key"


# PostgreSQL Config
PG_HOST = os.environ.get("PG_HOST", "postgres")
PG_DB = os.environ.get("PG_DB", "mqttdb")
PG_USER = os.environ.get("PG_USER", "mqttuser")
PG_PASS = os.environ.get("PG_PASS", "mqttpass")

# Retry connection to PostgreSQL
for attempt in range(10):
    try:
        conn = psycopg2.connect(
            host=PG_HOST, database=PG_DB, user=PG_USER, password=PG_PASS
        )
        print("✅ Connected to PostgreSQL!")
        break
    except OperationalError:
        print(f"❌ PostgreSQL not ready. Retrying in 3s... (attempt {attempt+1}/10)")
        time.sleep(3)
else:
    raise Exception("❌ Could not connect to PostgreSQL after 10 attempts")

cur = conn.cursor()
cur.execute("""
    CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        topic TEXT,
        payload BYTEA,
        timestamp TIMESTAMP
    )
""")
conn.commit()

def on_connect(client, userdata, flags, rc):
    print("✅ MQTT connected")
    client.subscribe(TOPIC)

def on_message(client, userdata, msg):
    timestamp = datetime.utcnow()
    print(f"📥 Message received from {msg.topic} at {timestamp}")
    cur.execute(
        "INSERT INTO messages (topic, payload, timestamp) VALUES (%s, %s, %s)",
        (msg.topic, msg.payload, timestamp)
    )
    conn.commit()
    print("💾 Saved to PostgreSQL")

client = mqtt.Client()
client.tls_set(ca_certs=CA, certfile=CERT, keyfile=KEY)
client.on_connect = on_connect
client.on_message = on_message
client.connect(BROKER, PORT, 60)
client.loop_forever()

import psycopg2
from datetime import datetime

# Modify these values if needed (they match your docker-compose defaults)
PG_HOST = "localhost"
PG_DB = "mqttdb"
PG_USER = "mqttuser"
PG_PASS = "mqttpass"

# Path to the image you want to insert
IMAGE_PATH = "/mnt/c/Users/alexa/Downloads/image.jpg"

# Image metadata
TOPIC = "test/topic/image"
WIDTH = 800  # You can measure this manually or leave as dummy
HEIGHT = 600

# Connect to PostgreSQL
conn = psycopg2.connect(
    host=PG_HOST,
    database=PG_DB,
    user=PG_USER,
    password=PG_PASS
)

with open(IMAGE_PATH, "rb") as f:
    image_bytes = f.read()

with conn.cursor() as cur:
    cur.execute(
        """
        INSERT INTO image_messages (topic, image, width, height, timestamp)
        VALUES (%s, %s, %s, %s, %s)
        """,
        (TOPIC, psycopg2.Binary(image_bytes), WIDTH, HEIGHT, datetime.utcnow())
    )

conn.commit()
conn.close()
print("✅ Image inserted into the database.")


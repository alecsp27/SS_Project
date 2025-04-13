package com.example.ss_project.mqtt

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.widget.Toast
import info.mqtt.android.service.MqttAndroidClient
import org.eclipse.paho.client.mqttv3.*
import java.io.InputStream
import java.security.KeyStore
import java.security.cert.CertificateFactory
import javax.net.ssl.*

class MqttClientManager(
    private val context: Context,
    private val brokerUri: String = "ssl://10.0.2.2:8883",
    private val clientId: String = "AndroidClient",
    private val topic: String = "test/topic",
    private val p12Password: String = "password123"
) {
    private var mqttClient: MqttAndroidClient? = null
    private var _isConnected: Boolean = false

    fun isConnected(): Boolean = _isConnected

    fun disconnect() {
        mqttClient?.let {
            try {
                it.unregisterResources()
                it.disconnect()
                _isConnected = false
                Log.i("MqttClientManager", "🔌 MQTT client disconnected")
            } catch (e: Exception) {
                Log.e("MqttClientManager", "❌ Error during disconnect: ${e.message}", e)
            }
        }
    }

    fun connect() {
        mqttClient = MqttAndroidClient(context, brokerUri, clientId)

        val options = MqttConnectOptions().apply {
            isCleanSession = true
            isAutomaticReconnect = true
            try {
                socketFactory = getSSLSocketFactory()
                Log.d("MqttClientManager", "✅ SSL SocketFactory set.")
            } catch (e: Exception) {
                Log.e("MqttClientManager", "❌ Error setting up SSL SocketFactory: ${e.message}", e)
                Handler(Looper.getMainLooper()).post {
                    Toast.makeText(context, "❌ SSL setup failed", Toast.LENGTH_LONG).show()
                }
                return
            }
        }

        mqttClient?.setCallback(object : MqttCallback {
            override fun connectionLost(cause: Throwable?) {
                _isConnected = false
                Log.w("MqttClientManager", "⚠️ Connection lost: ${cause?.message}")
                Handler(Looper.getMainLooper()).post {
                    Toast.makeText(context, "⚠️ MQTT disconnected", Toast.LENGTH_SHORT).show()
                }
            }

            override fun messageArrived(topic: String?, message: MqttMessage?) {
                Log.i("MqttClientManager", "📩 Message from $topic: ${message.toString()}")
            }

            override fun deliveryComplete(token: IMqttDeliveryToken?) {
                Log.d("MqttClientManager", "✅ Delivery complete")
            }
        })

        mqttClient?.connect(options, null, object : IMqttActionListener {
            override fun onSuccess(asyncActionToken: IMqttToken?) {
                _isConnected = true
                Log.i("MqttClientManager", "✅ Connected to MQTT broker")
                Handler(Looper.getMainLooper()).post {
                    Toast.makeText(context, "✅ MQTT connected", Toast.LENGTH_SHORT).show()
                }
                mqttClient?.subscribe(topic, 1)
            }

            override fun onFailure(asyncActionToken: IMqttToken?, exception: Throwable?) {
                _isConnected = false
                Log.e("MqttClientManager", "❌ Failed to connect: ${exception?.message}", exception)
                Handler(Looper.getMainLooper()).post {
                    Toast.makeText(context, "❌ MQTT connection failed", Toast.LENGTH_SHORT).show()
                }
            }
        })
    }

    fun publish(topic: String, payload: ByteArray) {
        if (isConnected()) {
            val message = MqttMessage(payload).apply {
                qos = 1
            }
            mqttClient?.publish(topic, message)
            Log.d("MqttClientManager", "📤 Published binary to $topic (${payload.size} bytes)")
        } else {
            Log.w("MqttClientManager", "⚠️ Cannot publish binary — MQTT not connected")
            Toast.makeText(context, "MQTT not connected", Toast.LENGTH_SHORT).show()
        }
    }


    private fun getSSLSocketFactory(): SSLSocketFactory {
        try {
            Log.d("MqttClientManager", "🔐 Loading client PKCS12 (.p12) from raw")
            val keyStore = KeyStore.getInstance("PKCS12")
            val clientInput: InputStream = context.resources.openRawResource(
                context.resources.getIdentifier("client", "raw", context.packageName)
            )
            keyStore.load(clientInput, p12Password.toCharArray())
            Log.d("MqttClientManager", "✅ KeyStore loaded with aliases: ${keyStore.aliases().toList()}")

            val kmf = KeyManagerFactory.getInstance("X509")
            kmf.init(keyStore, p12Password.toCharArray())
            Log.d("MqttClientManager", "✅ KeyManagerFactory initialized")

            Log.d("MqttClientManager", "📄 Loading CA certificate from raw")
            val caInput: InputStream = context.resources.openRawResource(
                context.resources.getIdentifier("ca", "raw", context.packageName)
            )
            val caCert = CertificateFactory.getInstance("X.509").generateCertificate(caInput)

            val trustStore = KeyStore.getInstance(KeyStore.getDefaultType())
            trustStore.load(null, null)
            trustStore.setCertificateEntry("ca", caCert)
            Log.d("MqttClientManager", "✅ TrustStore initialized with CA cert")

            val tmf = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm())
            tmf.init(trustStore)
            Log.d("MqttClientManager", "✅ TrustManagerFactory initialized")

            val sslContext = SSLContext.getInstance("TLS")
            sslContext.init(kmf.keyManagers, tmf.trustManagers, null)
            Log.d("MqttClientManager", "✅ SSLContext initialized")

            return sslContext.socketFactory
        } catch (e: Exception) {
            Log.e("MqttClientManager", "❌ Error in SSL setup: ${e.message}", e)
            throw RuntimeException("Error creating SSLSocketFactory", e)
        }
    }
}

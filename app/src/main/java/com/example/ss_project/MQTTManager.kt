package com.example.ss_project

import android.content.Context
import org.eclipse.paho.android.service.MqttAndroidClient
import org.eclipse.paho.client.mqttv3.*
import java.io.File
import java.io.InputStream
import java.security.KeyStore
import javax.net.ssl.SSLContext
import javax.net.ssl.TrustManagerFactory

class MQTTManager(context: Context) {
    private val serverUri = "ssl://your-mqtt-broker.com:8883"
    private val clientId = "android_client_${System.currentTimeMillis()}"
    private val topic = "camera/settings"

    private var mqttClient: MqttAndroidClient = MqttAndroidClient(context, serverUri, clientId)

    init {
        val options = MqttConnectOptions().apply {
            isCleanSession = true
            socketFactory = getSocketFactory(context)
        }

        mqttClient.connect(options, null, object : IMqttActionListener {
            override fun onSuccess(asyncActionToken: IMqttToken?) {
                println("Connected to MQTT broker")
                subscribeToTopic(topic)
            }
            override fun onFailure(asyncActionToken: IMqttToken?, exception: Throwable?) {
                println("MQTT connection failed: ${exception?.message}")
            }
        })
    }

    private fun getSocketFactory(context: Context): javax.net.ssl.SSLSocketFactory {
        val keystore = KeyStore.getInstance("PKCS12").apply {
            //TO DO: add the certificate
            val certInput: InputStream = context.assets.open("client.p12")
            load(certInput, "your_password".toCharArray())
        }

        val tmf = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm())
        tmf.init(keystore)

        val sslContext = SSLContext.getInstance("TLS")
        sslContext.init(null, tmf.trustManagers, null)

        return sslContext.socketFactory
    }

    private fun subscribeToTopic(topic: String) {
        mqttClient.subscribe(topic, 1, null, object : IMqttActionListener {
            override fun onSuccess(asyncActionToken: IMqttToken?) {
                println("Subscribed to $topic")
            }

            override fun onFailure(asyncActionToken: IMqttToken?, exception: Throwable?) {
                println("Subscription failed: ${exception?.message}")
            }
        })
    }
    fun sendImageToMQTT(imagePath: String) {
        val file = File(imagePath)
        val imageBytes = file.readBytes()
        mqttClient.publish("camera/live", imageBytes, 1, false)
    }

}

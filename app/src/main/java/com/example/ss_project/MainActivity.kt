package com.example.ss_project

import android.Manifest
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.example.ss_project.mqtt.MqttClientManager
import com.example.ss_project.ui.theme.SS_ProjectTheme
import java.io.File
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class MainActivity : ComponentActivity() {
    private lateinit var outputDirectory: File
    private lateinit var cameraExecutor: ExecutorService
    private lateinit var mqttClientManager: MqttClientManager

    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted: Boolean ->
        if (!isGranted) {
            Toast.makeText(this, "Camera permission denied", Toast.LENGTH_LONG).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        requestPermissionLauncher.launch(Manifest.permission.CAMERA)
        outputDirectory = getOutputDirectory()
        cameraExecutor = Executors.newSingleThreadExecutor()

        // ✅ Initialize and connect MQTT
        mqttClientManager = MqttClientManager(this)
        mqttClientManager.connect()

        // ✅ Test connection after a small delay
        Handler(Looper.getMainLooper()).postDelayed({
            if (mqttClientManager.isConnected()) {
                Handler(Looper.getMainLooper()).post {
                    Toast.makeText(this, "✅ MQTT connected", Toast.LENGTH_SHORT).show()
                }
                Log.i("MainActivity", "MQTT connected")
            } else {
                Handler(Looper.getMainLooper()).post {
                    Toast.makeText(this, "❌ MQTT NOT connected", Toast.LENGTH_SHORT).show()
                }
                Log.e("MainActivity", "MQTT NOT connected")
            }
        }, 2000)


        setContent {
            SS_ProjectTheme {
                CameraScreen(outputDirectory, cameraExecutor, this@MainActivity)
            }
        }
    }

    private fun getOutputDirectory(): File {
        val mediaDir = externalMediaDirs.firstOrNull()?.let {
            File(it, "CameraApp").apply { mkdirs() }
        }
        return mediaDir ?: filesDir
    }

    override fun onDestroy() {
        super.onDestroy()
        cameraExecutor.shutdown()
        if (mqttClientManager.isConnected()) {
            mqttClientManager.disconnect()
        }
    }

    @Composable
    fun CameraScreen(outputDirectory: File, cameraExecutor: ExecutorService, lifecycleOwner: ComponentActivity) {
        val context = LocalContext.current
        val previewView = remember { androidx.camera.view.PreviewView(context) }
        var imageCapture: ImageCapture? by remember { mutableStateOf(null) }

        val cameraProviderFuture = remember { ProcessCameraProvider.getInstance(context) }

        LaunchedEffect(cameraProviderFuture) {
            cameraProviderFuture.addListener({
                val cameraProvider: ProcessCameraProvider = cameraProviderFuture.get()
                val preview = Preview.Builder().build().also {
                    it.setSurfaceProvider(previewView.surfaceProvider)
                }
                imageCapture = ImageCapture.Builder().build()
                val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA

                try {
                    cameraProvider.unbindAll()
                    cameraProvider.bindToLifecycle(
                        lifecycleOwner, cameraSelector, preview, imageCapture
                    )
                } catch (e: Exception) {
                    Log.e("CameraScreen", "Camera initialization failed", e)
                }
            }, ContextCompat.getMainExecutor(context))
        }

        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            AndroidView(factory = { previewView }, modifier = Modifier.weight(1f))

            Button(
                onClick = {
                    imageCapture?.let { capturePhoto(context, it, outputDirectory, cameraExecutor) }
                },
            ) {
                Text("Capture Image")
            }
        }
    }

    private fun capturePhoto(
        context: android.content.Context,
        imageCapture: ImageCapture,
        outputDirectory: File,
        cameraExecutor: ExecutorService
    ) {
        val photoFile = File(outputDirectory, "${System.currentTimeMillis()}.jpg")
        val outputOptions = ImageCapture.OutputFileOptions.Builder(photoFile).build()

        imageCapture.takePicture(
            outputOptions,
            ContextCompat.getMainExecutor(context),
            object : ImageCapture.OnImageSavedCallback {
                override fun onImageSaved(outputFileResults: ImageCapture.OutputFileResults) {
                    Toast.makeText(context, "Image Saved: ${photoFile.absolutePath}", Toast.LENGTH_SHORT).show()
                }

                override fun onError(exception: ImageCaptureException) {
                    Toast.makeText(context, "Capture Failed: ${exception.message}", Toast.LENGTH_SHORT).show()
                }
            }
        )
    }
}

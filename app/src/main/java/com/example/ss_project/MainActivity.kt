package com.example.ss_project

import android.Manifest
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.util.Range
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
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
        val previewView = remember { PreviewView(context) }
        var imageCapture: ImageCapture? by remember { mutableStateOf(null) }
        var camera: Camera? by remember { mutableStateOf(null) }
        var showMenu by remember { mutableStateOf(false) }
        var showExposureDialog by remember { mutableStateOf(false) }
        var currentExposure by remember { mutableIntStateOf(0) }

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
                    camera = cameraProvider.bindToLifecycle(
                        lifecycleOwner, cameraSelector, preview, imageCapture
                    )
                    camera?.cameraInfo?.exposureState?.let { state ->
                        currentExposure = state.exposureCompensationIndex
                    }
                } catch (e: Exception) {
                    Log.e("CameraScreen", "Camera initialization failed", e)
                }
            }, ContextCompat.getMainExecutor(context))
        }

        Box(modifier = Modifier.fillMaxSize()) {
            Column(modifier = Modifier.fillMaxSize()) {
                AndroidView(factory = { previewView }, modifier = Modifier.weight(1f))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Button(
                        onClick = {
                            imageCapture?.let { capturePhoto(context, it, outputDirectory, cameraExecutor) }
                        },
                        modifier = Modifier.padding(8.dp)
                    ) {
                        Text("Capture Image")
                    }

                    IconButton(onClick = { showMenu = true }) {
                        Icon(Icons.Default.MoreVert, contentDescription = "Settings")
                    }
                }
            }

            DropdownMenu(expanded = showMenu, onDismissRequest = { showMenu = false }) {
                DropdownMenuItem(text = { Text("Adjust Brightness") }, onClick = {
                    showExposureDialog = true
                    showMenu = false
                })
                DropdownMenuItem(text = { Text("Toggle Night Mode") }, onClick = {
                    camera?.let {
                        val hasFlash = it.cameraInfo.hasFlashUnit()
                        if (hasFlash) {
                            val torchOn = it.cameraInfo.torchState.value == TorchState.ON
                            it.cameraControl.enableTorch(!torchOn)
                        }
                    }
                    showMenu = false
                })
            }

            if (showExposureDialog) {
                camera?.cameraInfo?.exposureState?.let { exposureState ->
                    ExposureDialog(
                        current = currentExposure,
                        range = exposureState.exposureCompensationRange,
                        onValueChange = {
                            currentExposure = it
                            camera?.cameraControl?.setExposureCompensationIndex(it)
                        },
                        onDismiss = { showExposureDialog = false }
                    )
                }
            }
        }
    }

    @Composable
    fun ExposureDialog(current: Int, range: Range<Int>, onValueChange: (Int) -> Unit, onDismiss: () -> Unit) {
        var sliderValue by remember { mutableFloatStateOf(current.toFloat()) }

        AlertDialog(
            onDismissRequest = onDismiss,
            title = { Text("Brightness") },
            text = {
                Column {
                    Slider(
                        value = sliderValue,
                        valueRange = range.lower.toFloat()..range.upper.toFloat(),
                        steps = (range.upper - range.lower - 1).coerceAtLeast(0),
                        onValueChange = {
                            sliderValue = it
                            onValueChange(it.toInt())
                        }
                    )
                    Text("Current: ${sliderValue.toInt()}")
                }
            },
            confirmButton = {
                TextButton(onClick = onDismiss) {
                    Text("OK")
                }
            }
        )
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

                    try {
                        // ✅ Compress image to reduce payload size
                        val compressedBytes = android.graphics.BitmapFactory.decodeFile(photoFile.absolutePath).let { bitmap ->
                            val stream = java.io.ByteArrayOutputStream()
                            bitmap.compress(android.graphics.Bitmap.CompressFormat.JPEG, 70, stream) // 70% quality
                            stream.toByteArray()
                        }

                        val base64Image = android.util.Base64.encodeToString(compressedBytes, android.util.Base64.NO_WRAP)
                        val bitmap = android.graphics.BitmapFactory.decodeByteArray(compressedBytes, 0, compressedBytes.size)
                        val width = bitmap.width
                        val height = bitmap.height
                        val timestamp = System.currentTimeMillis()

                        val json = """
                        {
                            "filename": "${photoFile.name}",
                            "timestamp": $timestamp,
                            "width": $width,
                            "height": $height,
                            "image_base64": "$base64Image"
                        }
                    """.trimIndent()

                        mqttClientManager.publish("test/topic/image", json.toByteArray())
                        Log.i("MainActivity", "📤 Image JSON published (${json.length} bytes)")
                    } catch (e: Exception) {
                        Log.e("MainActivity", "❌ Failed to encode or publish image: ${e.message}", e)
                    }
                }

                override fun onError(exception: ImageCaptureException) {
                    Toast.makeText(context, "Capture Failed: ${exception.message}", Toast.LENGTH_SHORT).show()
                }
            }
        )
    }


}

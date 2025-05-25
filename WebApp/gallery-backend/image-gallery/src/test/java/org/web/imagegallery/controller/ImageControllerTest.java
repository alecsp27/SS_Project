package org.web.imagegallery.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.web.imagegallery.dto.ImageMetadataDTO;
import org.web.imagegallery.service.ImageService;

import java.sql.Timestamp;
import java.util.Arrays;
import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ImageController.class)
class ImageControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ImageService service;

    @Test
    @DisplayName("GET /api/images should return image metadata list")
    void testListImages() throws Exception {
        List<ImageMetadataDTO> mockMetadata = Arrays.asList(
                new ImageMetadataDTO(1L, 800, 600, Timestamp.valueOf("2025-05-25 12:00:00")),
                new ImageMetadataDTO(2L, 1024, 768, Timestamp.valueOf("2025-05-26 15:00:00"))
        );

        when(service.getAllImageMetadata()).thenReturn(mockMetadata);

        mockMvc.perform(get("/api/images"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].width").value(800))
                .andExpect(jsonPath("$[0].height").value(600));
    }

    @Test
    @DisplayName("GET /api/images/{id}/data should return image data")
    void testGetImageSuccess() throws Exception {
        byte[] mockImage = new byte[]{1, 2, 3};
        when(service.getImageById(42L)).thenReturn(mockImage);

        mockMvc.perform(get("/api/images/42/data"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.IMAGE_JPEG))
                .andExpect(content().bytes(mockImage));
    }

    @Test
    @DisplayName("GET /api/images/{id}/data should return 404 if not found")
    void testGetImageNotFound() throws Exception {
        when(service.getImageById(99L)).thenReturn(null);

        mockMvc.perform(get("/api/images/99/data"))
                .andExpect(status().isNotFound());
    }
}

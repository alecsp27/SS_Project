package org.web.imagegallery.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.web.imagegallery.dto.ImageMetadataDTO;
import org.web.imagegallery.service.ImageService;

import java.util.List;

@RestController
@RequestMapping("/api/images")
public class ImageController {

    @Autowired
    private ImageService service;

    @GetMapping
    public List<ImageMetadataDTO> listImages() {
        return service.getAllImageMetadata();
    }

    @GetMapping("/{id}/data")
    public ResponseEntity<byte[]> getImage(@PathVariable Long id) {
        byte[] imageData = service.getImageById(id);
        if (imageData == null) {
            return ResponseEntity.notFound().build();
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.IMAGE_JPEG); // or detect dynamically
        return new ResponseEntity<>(imageData, headers, HttpStatus.OK);
    }
}

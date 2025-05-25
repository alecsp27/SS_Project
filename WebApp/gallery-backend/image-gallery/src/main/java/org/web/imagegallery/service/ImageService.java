package org.web.imagegallery.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.web.imagegallery.dto.ImageMetadataDTO;
import org.web.imagegallery.repository.ImageMessageRepository;

import java.util.List;

@Service
public class ImageService {

    @Autowired
    private ImageMessageRepository repo;

    public List<ImageMetadataDTO> getAllImageMetadata() {
        return repo.findAllMetadata();
    }

    public byte[] getImageById(Long id) {
        return repo.findImageById(id);
    }
}

package org.web.imagegallery.dto;

import java.sql.Timestamp;

public record ImageMetadataDTO(Long id, int width, int height, Timestamp timestamp) {
}

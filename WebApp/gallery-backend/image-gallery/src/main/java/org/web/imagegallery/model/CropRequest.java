package org.web.imagegallery.model;

import lombok.Data;

@Data
public class CropRequest {
    private int x;
    private int y;
    private int width;
    private int height;
}

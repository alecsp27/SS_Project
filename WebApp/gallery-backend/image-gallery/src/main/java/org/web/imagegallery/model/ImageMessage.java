package org.web.imagegallery.model;

import jakarta.persistence.*;
import lombok.Data;

import java.sql.Timestamp;

@Entity
@Data
@Table(name = "image_messages")
public class ImageMessage {
    @Id
    @GeneratedValue
    private Long id;

    private String topic;

    @Lob
    @Basic(fetch = FetchType.LAZY)
    @Column(name = "image", columnDefinition = "bytea")
    private byte[] image;

    private int width;
    private int height;

    private Timestamp timestamp;

}

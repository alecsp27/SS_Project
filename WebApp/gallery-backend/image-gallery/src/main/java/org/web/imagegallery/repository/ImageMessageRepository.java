package org.web.imagegallery.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.web.imagegallery.dto.ImageMetadataDTO;
import org.web.imagegallery.model.ImageMessage;

import java.util.List;

public interface ImageMessageRepository extends JpaRepository<ImageMessage, Long> {

    @Query("SELECT new org.web.imagegallery.dto.ImageMetadataDTO(i.id, i.width, i.height, i.timestamp) FROM ImageMessage i")
    List<ImageMetadataDTO> findAllMetadata();

    @Query(value = "SELECT image FROM image_messages WHERE id = :id", nativeQuery = true)
    byte[] findImageById(@Param("id") Long id);
}

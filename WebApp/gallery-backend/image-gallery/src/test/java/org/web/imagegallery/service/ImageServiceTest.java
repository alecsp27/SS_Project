package org.web.imagegallery.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.web.imagegallery.dto.ImageMetadataDTO;
import org.web.imagegallery.repository.ImageMessageRepository;

import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ImageServiceTest {

    private ImageMessageRepository repo;
    private ImageService service;

    @BeforeEach
    void setUp() {
        repo = mock(ImageMessageRepository.class);
        service = new ImageService();
        // Inject mock repo manually since @Autowired isn't used in unit test
        var repoField = ImageService.class.getDeclaredFields()[0];
        repoField.setAccessible(true);
        try {
            repoField.set(service, repo);
        } catch (IllegalAccessException e) {
            throw new RuntimeException(e);
        }
    }

    @Test
    void testGetAllImageMetadata() {
        List<ImageMetadataDTO> mockList = Arrays.asList(
                new ImageMetadataDTO(1L, 100, 200, null),
                new ImageMetadataDTO(2L, 150, 250, null)
        );

        when(repo.findAllMetadata()).thenReturn(mockList);

        List<ImageMetadataDTO> result = service.getAllImageMetadata();

        assertEquals(2, result.size());
        assertEquals(100, result.get(0).width());
        verify(repo, times(1)).findAllMetadata();
    }

    @Test
    void testGetImageById() {
        byte[] mockData = new byte[]{1, 2, 3};

        when(repo.findImageById(42L)).thenReturn(mockData);

        byte[] result = service.getImageById(42L);

        assertNotNull(result);
        assertEquals(3, result.length);
        verify(repo, times(1)).findImageById(42L);
    }
}

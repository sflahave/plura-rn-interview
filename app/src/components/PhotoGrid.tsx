import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  launchCamera,
  launchImageLibrary,
  type ImagePickerResponse,
} from 'react-native-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { APIPhoto, APIPhotoBase, GridItem } from '../types/api';
import {
  addMemberPhoto,
  deleteMemberPhoto,
  loadMemberPhotos,
  updateMemberPhoto,
} from '../services/photoApi';
import { GAP, MAX_PHOTOS, photoHeight, photoWidth } from '../utils/photoUtils';
import { DraggablePhoto } from './DraggablePhoto';

interface Props {
  memberId: string;
}

export function PhotoGrid({ memberId }: Props) {
  const safeAreaInsets = useSafeAreaInsets();
  const [memberPhotos, setMemberPhotos] = useState<APIPhoto[]>([]);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  // Whenever memberId changes, this function will be recreated, which
  // will trigger useEffect to invoke it automatically. So whenever we get a new
  // memberId value, we'll automatically fetch the photos for that member.
  const fetchPhotos = useCallback(async () => {
    try {
      const photos = await loadMemberPhotos(memberId);
      // Sort by position
      const sortedPhotos = photos.sort((a, b) => a.position - b.position);
      setMemberPhotos(sortedPhotos);
    } catch (error) {
      console.error('Failed to load photos:', error);
      Alert.alert('Error', 'Failed to load photos');
    }
  }, [memberId]);

  // This will be invoked whenever fetchPhotos changes, which happens
  // whenever memberId changes.
  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPhotos();
    setRefreshing(false);
  };

  const handleImageError = (id: string) => {
    setFailedImages(prev => new Set(prev).add(id));
  };

  const handleDeletePhoto = (id: string) => {
    Alert.alert('Delete Photo', 'Are you sure you want to delete this photo?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMemberPhoto(id);
            setMemberPhotos(prev => prev.filter(photo => photo.id !== id));
          } catch (error) {
            console.error('Failed to delete photo:', error);
            Alert.alert('Error', 'Failed to delete photo');
          }
        },
      },
    ]);
  };

  const handleAddPhoto = () => {
    Alert.alert('Add Photo', 'Choose a photo source', [
      {
        text: 'Camera',
        onPress: () => {
          launchCamera(
            {
              mediaType: 'photo',
              includeBase64: false,
              maxWidth: 2000,
              maxHeight: 2000,
            },
            handleImagePickerResponse,
          );
        },
      },
      {
        text: 'Photo Library',
        onPress: () => {
          launchImageLibrary(
            {
              mediaType: 'photo',
              includeBase64: false,
              maxWidth: 2000,
              maxHeight: 2000,
            },
            handleImagePickerResponse,
          );
        },
      },
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ]);
  };

  const handleImagePickerResponse = async (response: ImagePickerResponse) => {
    if (response.didCancel) {
      console.log('User cancelled image picker');
      return;
    }

    if (response.errorCode) {
      console.log('ImagePicker Error: ', response.errorMessage);
      Alert.alert('Error', response.errorMessage || 'Failed to pick image');
      return;
    }

    const asset = response.assets?.[0];
    if (!asset || !asset.uri) {
      return;
    }

    try {
      const newPhoto: APIPhotoBase = {
        url: asset.uri,
        width: asset.width || 0,
        height: asset.height || 0,
        position: memberPhotos.length,
        centerX: (asset.width || 0) / 2,
        centerY: (asset.height || 0) / 2,
      };

      const addedPhoto = await addMemberPhoto(memberId, newPhoto);
      setMemberPhotos(prev => [...prev, addedPhoto]);
    } catch (error) {
      console.error('Failed to add photo:', error);
      Alert.alert('Error', 'Failed to add photo');
    }
  };

  const gridData: GridItem[] = [
    ...memberPhotos,
    ...Array(Math.max(0, MAX_PHOTOS - memberPhotos.length))
      .fill(null)
      .map((_, i) => ({
        type: 'placeholder' as const,
        id: `placeholder-${i}`,
      })),
  ];

  const handlePositionChange = async (fromIndex: number, toIndex: number) => {
    const newPhotos = [...memberPhotos];
    const [movedItem] = newPhotos.splice(fromIndex, 1);
    newPhotos.splice(toIndex, 0, movedItem);

    // Update position property for all photos
    const updatedPhotos = newPhotos.map((photo, index) => ({
      ...photo,
      position: index,
    }));

    // Update local state immediately
    setMemberPhotos(updatedPhotos);

    // Update positions in the backend
    try {
      await Promise.all(updatedPhotos.map(photo => updateMemberPhoto(photo)));
    } catch (error) {
      console.error('Failed to update photo positions:', error);
      Alert.alert('Error', 'Failed to save photo order');
    }
  };

  const renderItem = ({ item, index }: { item: GridItem; index: number }) => {
    if ('type' in item && item.type === 'placeholder') {
      return (
        <View style={styles.photoContainer}>
          <View style={styles.placeholderContainer} />
          <TouchableOpacity style={styles.addButton} onPress={handleAddPhoto}>
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // At this point, item must be APIPhoto (type assertion)
    return (
      <DraggablePhoto
        item={item as APIPhoto}
        index={index}
        onDelete={handleDeletePhoto}
        onPositionChange={handlePositionChange}
        failedImages={failedImages}
        onImageError={handleImageError}
      />
    );
  };

  return (
    <View
      // eslint-disable-next-line react-native/no-inline-styles
      style={{
        flex: 1,
        paddingTop: safeAreaInsets.top,
        paddingBottom: safeAreaInsets.bottom,
      }}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Media</Text>
      </View>
      <View style={styles.container}>
        <FlatList
          data={gridData}
          numColumns={3}
          keyExtractor={item => item.id}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          renderItem={renderItem}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  container: {
    flex: 1,
    paddingHorizontal: 8,
  },
  listContent: {
    gap: GAP,
  },
  row: {
    gap: GAP,
  },
  photoContainer: {
    width: photoWidth,
    height: photoHeight,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  placeholderContainer: {
    flex: 1,
    backgroundColor: '#e0e0e0',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#757575',
    borderRadius: 12,
  },
  addButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ff5864',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  addButtonText: {
    fontSize: 18,
    color: 'white',
    fontWeight: '500',
    lineHeight: 18,
  },
});

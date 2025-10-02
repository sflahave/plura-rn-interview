import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

import { APIPhoto } from '../types/api';
import {
  calculatePhotoTransform,
  GAP,
  MAX_PHOTOS,
  photoHeight,
  photoWidth,
} from '../utils/photoUtils';

interface DraggablePhotoProps {
  item: APIPhoto;
  onDelete: (id: string) => void;
  onPositionChange: (fromIndex: number, toIndex: number) => void;
  index: number;
  failedImages: Set<string>;
  onImageError: (id: string) => void;
}

export function DraggablePhoto({
  item,
  onDelete,
  onPositionChange,
  index,
  failedImages,
  onImageError,
}: DraggablePhotoProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const [isDragging, setIsDragging] = useState(false);

  const pan = Gesture.Pan()
    .onStart(() => {
      runOnJS(setIsDragging)(true);
    })
    .onUpdate(e => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd(() => {
      // Calculate which position this item should move to based on translation
      const col = Math.round(translateX.value / (photoWidth + GAP));
      const row = Math.round(translateY.value / (photoHeight + GAP));
      const newIndex = index + col + row * 3;

      // Reset position
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      runOnJS(setIsDragging)(false);

      // Update position if valid
      if (newIndex >= 0 && newIndex < MAX_PHOTOS && newIndex !== index) {
        runOnJS(onPositionChange)(index, newIndex);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
    zIndex: isDragging ? 1000 : 1,
  }));

  // Calculate photo transform for centering
  const photoTransform = calculatePhotoTransform({
    width: item.width,
    height: item.height,
    centerX: item.centerX,
    centerY: item.centerY,
  });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[
          styles.photoContainer,
          animatedStyle,
          isDragging && styles.draggingPhoto,
        ]}
      >
        {failedImages.has(item.id) ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Failed to load</Text>
          </View>
        ) : (
          <View style={styles.photoWrapper}>
            <Image
              source={{ uri: item.url }}
              style={[
                styles.photo,
                {
                  width: photoTransform.scaledWidth,
                  height: photoTransform.scaledHeight,
                  transform: [
                    { translateX: photoTransform.translateX },
                    { translateY: photoTransform.translateY },
                  ],
                },
              ]}
              resizeMode="stretch"
              onError={e => {
                console.log('Image load error:', item.id, e.nativeEvent.error);
                onImageError(item.id);
              }}
            />
          </View>
        )}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => onDelete(item.id)}
        >
          <Text style={styles.deleteButtonText}>✕</Text>
        </TouchableOpacity>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  photoContainer: {
    width: photoWidth,
    height: photoHeight,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  photoWrapper: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  photo: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffebee',
  },
  errorText: {
    fontSize: 10,
    color: '#c62828',
    textAlign: 'center',
  },
  deleteButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  deleteButtonText: {
    fontSize: 18,
    color: '#333',
    fontWeight: '500',
  },
  draggingPhoto: {
    opacity: 0.8,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
});

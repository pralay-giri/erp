import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle, DimensionValue } from 'react-native';

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle | ViewStyle[];
}

export function Skeleton({ 
  width = '100%', 
  height = 20, 
  borderRadius = 8,
  style 
}: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: '#334155', // slate-700
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function LeadSkeleton() {
  return (
    <View className="bg-card border border-border p-5 rounded-[32px] mb-4 opacity-50">
      <View className="flex-row justify-between items-start mb-6">
        <View className="flex-1 mr-4">
          <Skeleton width="60%" height={24} borderRadius={12} style={{ marginBottom: 8 }} />
          <Skeleton width="40%" height={16} borderRadius={8} />
        </View>
        <Skeleton width={80} height={32} borderRadius={16} />
      </View>
      <View className="flex-row gap-3">
        <Skeleton height={48} borderRadius={16} style={{ flex: 1 }} />
        <Skeleton width={100} height={48} borderRadius={16} />
      </View>
    </View>
  );
}

export function DashboardSkeleton() {
  return (
    <View className="flex-1 bg-background px-6 pt-12">
      <View className="flex-row justify-between items-center mb-12">
        <View>
          <Skeleton width={120} height={16} borderRadius={4} style={{ marginBottom: 8 }} />
          <Skeleton width={200} height={48} borderRadius={12} />
        </View>
        <Skeleton width={56} height={56} borderRadius={20} />
      </View>
      
      <Skeleton width={150} height={32} borderRadius={8} style={{ marginBottom: 24 }} />
      
      <View className="flex-row flex-wrap -mx-2">
        {[1, 2, 3, 4].map((i) => (
          <View key={i} className="w-1/2 p-2">
            <View className="bg-card/40 p-6 rounded-[32px] border border-border h-40">
              <Skeleton width={48} height={48} borderRadius={16} style={{ marginBottom: 24 }} />
              <Skeleton width="80%" height={32} borderRadius={8} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export function TableRowSkeleton() {
  return (
    <View className="flex-row items-center py-4 border-b border-border/50">
      <View className="flex-1 mr-4">
        <Skeleton width="70%" height={16} borderRadius={4} style={{ marginBottom: 4 }} />
        <Skeleton width="40%" height={12} borderRadius={4} />
      </View>
      <Skeleton width={60} height={24} borderRadius={12} />
    </View>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, ActivityIndicator, RefreshControl, TextInput, TouchableOpacity, Platform, Animated, Modal, KeyboardAvoidingView, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery, keepPreviousData, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from "../context/AuthContext";
import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Search, Package, AlertTriangle, Boxes, X, LayoutGrid, Info, Loader2, Plus, Pencil } from 'lucide-react-native';
import api from '../services/api';
import { Colors } from '../constants/Colors';
import Toast from 'react-native-toast-message';
import { LeadSkeleton } from '../components/Skeleton';

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  current_stock: number;
  price: string;
}

const ProductItem = ({ item, onRestock, onEdit, canRestock }: {
  item: InventoryItem,
  onRestock: (id: string) => void,
  onEdit: (item: InventoryItem) => void,
  canRestock: boolean
}) => {
  const isOutOfStock = item.current_stock === 0;
  const isLowStock = item.current_stock > 0 && item.current_stock < 10;

  return (
    <View
      className={`bg-card border p-6 rounded-[32px] mb-4 shadow-sm ${isOutOfStock ? 'border-red-500/50 bg-red-500/5' :
        isLowStock ? 'border-amber-500/50 bg-amber-500/5' :
          'border-border'
        }`}
    >
      <View className="flex-row justify-between items-start mb-4">
        <View className="flex-1 mr-3">
          <View className="flex-row items-center mb-1">
            <LayoutGrid size={12} color={Colors.muted} className="mr-1" />
            <Text className="text-muted text-[10px] uppercase font-bold tracking-widest">
              {item.sku}
            </Text>
          </View>
          <Text className="text-white text-xl font-bold tracking-tight" numberOfLines={2}>
            {item.name}
          </Text>
        </View>
        <View className="bg-background/50 px-4 py-2 rounded-2xl border border-white/5">
          <Text className="text-primary font-black text-lg">
            ₹{parseFloat(item.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center justify-between mt-2 pt-4 border-t border-white/5">
        <View className="flex-row items-center">
          <View className={`w-10 h-10 rounded-2xl items-center justify-center ${isOutOfStock ? 'bg-red-500/10' : isLowStock ? 'bg-amber-500/10' : 'bg-primary/10'
            }`}>
            <Boxes size={20} color={isOutOfStock ? "#ef4444" : isLowStock ? "#f59e0b" : Colors.primary} />
          </View>
          <View className="ml-3">
            <Text className="text-muted text-[10px] uppercase font-bold tracking-tighter">Current Stock</Text>
            <Text className={`text-lg font-black ${isOutOfStock ? 'text-red-500' :
              isLowStock ? 'text-amber-500' :
                'text-white'
              }`}>
              {item.current_stock} <Text className="text-xs font-medium text-muted">units</Text>
            </Text>
          </View>
        </View>

        {(isOutOfStock || isLowStock) && (
          <View className={`flex-row items-center px-4 py-2 rounded-2xl ${isOutOfStock ? 'bg-red-500/10 border border-red-500/20' : 'bg-amber-500/10 border border-amber-500/20'
            }`}>
            <AlertTriangle size={14} color={isOutOfStock ? "#ef4444" : "#f59e0b"} />
            <Text className={`text-xs font-bold ml-2 ${isOutOfStock ? 'text-red-500' : 'text-amber-500'
              }`}>
              {isOutOfStock ? 'RESTOCK' : 'LOW STOCK'}
            </Text>
          </View>
        )}
      </View>

      {canRestock && (
        <View className="mt-6 flex-row gap-3">
          <TouchableOpacity
            onPress={() => onEdit(item)}
            activeOpacity={0.7}
            className="flex-1 bg-white/5 h-14 rounded-2xl flex-row items-center justify-center border border-white/10 px-2"
          >
            <Pencil size={14} color={Colors.muted} />
            <Text className="text-muted font-bold ml-2 text-xs" numberOfLines={1}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onRestock(item.id)}
            activeOpacity={0.8}
            className="flex-1 bg-primary h-14 rounded-2xl flex-row items-center justify-center shadow-xl shadow-primary/40 px-2"
          >
            <Plus size={16} color="white" />
            <Text className="text-white font-bold ml-2 text-xs" numberOfLines={1}>Restock</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default function Warehouse() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canRestock = ["admin", "warehouse"].includes(user?.role?.toLowerCase() || "");
  const canCreate = ["admin", "warehouse"].includes(user?.role?.toLowerCase() || "");

  const [restockModalVisible, setRestockModalVisible] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [restockAmount, setRestockAmount] = useState("");

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editPrice, setEditPrice] = useState("");
  const [editStock, setEditStock] = useState("");

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSku, setNewSku] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newStock, setNewStock] = useState("0");

  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [fadeAnim]);


  const restockMutation = useMutation({
    mutationFn: async ({ productId, amount }: { productId: string, amount: number }) => {
      const response = await api.post("/warehouse/restock", { productId, amount });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ["dashboard"], refetchType: 'all' });
      setRestockModalVisible(false);
      setRestockAmount("");
      setSelectedProductId(null);
      Toast.show({
        type: 'success',
        text1: 'Stock Restocked',
        text2: 'The inventory level has been updated successfully.'
      });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async (payload: { productId: string, price?: number, current_stock?: number }) => {
      const response = await api.post("/warehouse/update-product", payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ["dashboard"], refetchType: 'all' });
      setEditModalVisible(false);
      setSelectedProductId(null);
      Toast.show({
        type: 'success',
        text1: 'Product Updated',
        text2: 'Changes have been saved successfully.'
      });
    },
  });

  const handleRestock = () => {
    const amount = parseInt(restockAmount);
    if (!selectedProductId || isNaN(amount) || amount <= 0) return;
    restockMutation.mutate({ productId: selectedProductId, amount });
  };

  const handleUpdateProduct = () => {
    if (!selectedProductId) return;
    updateProductMutation.mutate({
      productId: selectedProductId,
      price: editPrice ? parseFloat(editPrice) : undefined,
      current_stock: editStock ? parseInt(editStock) : undefined
    });
  };

  const createProductMutation = useMutation({
    mutationFn: async (payload: { name: string, sku: string, price: number, initialStock: number }) => {
      const response = await api.post("/warehouse/products", payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ["dashboard"], refetchType: 'all' });
      setCreateModalVisible(false);
      setNewName("");
      setNewSku("");
      setNewPrice("");
      setNewStock("0");
      Toast.show({
        type: 'success',
        text1: 'Product Created',
        text2: 'New item added to catalog successfully.'
      });
    },
    onError: (error: any) => {
      const msg = error.response?.data?.error || "";
      if (msg.includes("UNIQUE_CONSTRAINT")) {
        Toast.show({
          type: 'error',
          text1: 'Duplicate SKU',
          text2: 'This SKU already exists in the system.'
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Failed to create product',
          text2: error.response?.data?.error || 'Something went wrong.'
        });
        console.error(error);
      }
    }
  });

  const generateSku = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'SKU-';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewSku(result);
  };

  const handleCreateProduct = () => {
    if (!newName.trim() || !newSku.trim() || !newPrice.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Required Fields',
        text2: 'Please fill in all mandatory fields (*).'
      });
      return;
    }
    const price = parseFloat(newPrice);
    const stock = parseInt(newStock);
    if (price <= 0) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Price',
        text2: 'Price must be greater than zero.'
      });
      return;
    }
    if (stock < 0) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Stock',
        text2: 'Initial stock cannot be negative.'
      });
      return;
    }

    createProductMutation.mutate({
      name: newName,
      sku: newSku,
      price,
      initialStock: stock
    });
  };

  const params = useLocalSearchParams<{ lowStock?: string }>();
  const [search, setSearch] = useState(params.lowStock === "true" ? "Low Stock Filter" : "");
  const [debouncedSearch, setDebouncedSearch] = useState(params.lowStock === "true" ? "low_stock_internal" : "");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const {
    data,
    isLoading,
    isRefetching,
    isFetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["inventory", user?.id, debouncedSearch],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      const response = await api.get("/warehouse/inventory", {
        params: {
          search: debouncedSearch === "low_stock_internal" ? undefined : (debouncedSearch || undefined),
          lowStock: debouncedSearch === "low_stock_internal" ? "true" : undefined,
          limit: 10,
          offset: pageParam,
        },
      });
      return response.data;
    },
    getNextPageParam: (lastPage) => {
      const { offset, limit, totalItems } = lastPage.meta;
      const nextOffset = (offset || 0) + (limit || 10);
      return nextOffset < totalItems ? nextOffset : undefined;
    },
    placeholderData: keepPreviousData,
  });

  const products = data?.pages.flatMap((page) => page.data) || [];
  const totalProducts = data?.pages[0]?.meta?.totalItems || 0;

  // Only show full-screen loader on the very first mount with no data
  const showInitialLoader = isLoading && products.length === 0;

  if (showInitialLoader) {
    return (
      <SafeAreaView className="flex-1 bg-background px-6 pt-12">
        <LeadSkeleton />
        <LeadSkeleton />
        <LeadSkeleton />
        <LeadSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <StatusBar style="light" />

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProductItem
            item={item}
            canRestock={canRestock}
            onRestock={(id) => {
              setSelectedProductId(id);
              setRestockModalVisible(true);
            }}
            onEdit={(product) => {
              setSelectedProductId(product.id);
              setEditPrice(product.price.toString());
              setEditStock(product.current_stock.toString());
              setEditModalVisible(true);
            }}
          />
        )}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: Platform.OS === 'ios' ? 20 : 40,
          paddingBottom: 120
        }}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View className="py-8">
              <ActivityIndicator color={Colors.primary} />
            </View>
          ) : (
            products.length > 0 && !hasNextPage ? (
              <View className="items-center py-10 opacity-30">
                <View className="h-[1px] w-12 bg-muted mb-4" />
                <Text className="text-muted text-[10px] font-bold tracking-widest uppercase">End of Inventory</Text>
              </View>
            ) : null
          )
        }
        ListHeaderComponent={
          <View className="mb-10">
            <View className="flex-row justify-between items-start mb-10">
              <View className="flex-1 mr-4">
                <View className="flex-row items-center mb-2">
                  <Animated.View
                    style={{ opacity: fadeAnim }}
                    className="w-2 h-2 rounded-full bg-emerald-500 mr-2"
                  />
                  <Text className="text-emerald-500 font-bold tracking-widest text-[10px] uppercase">System Live</Text>
                </View>
                <Text
                  className="text-white text-4xl font-black tracking-tight"
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  Warehouse
                </Text>
                <View className="flex-row items-center mt-3">
                  <Info size={12} color={Colors.muted} />
                  <Text className="text-muted text-sm ml-2">
                    <Text className="text-white font-bold">{totalProducts}</Text> Items
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center">
                {canCreate && (
                  <TouchableOpacity
                    onPress={() => setCreateModalVisible(true)}
                    activeOpacity={0.8}
                    className="bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/10 mr-3"
                  >
                    <Plus size={24} color="#10b981" />
                  </TouchableOpacity>
                )}
                <View className="bg-primary/10 p-4 rounded-2xl border border-primary/10">
                  <Package size={24} color={Colors.primary} />
                </View>
              </View>
            </View>

            {/* Search Bar */}
            <View className="bg-card border border-border rounded-[24px] flex-row items-center px-5 h-16 shadow-2xl">
              <Search size={22} color={Colors.muted} />
              <TextInput
                className="flex-1 text-white ml-4 text-lg font-medium"
                placeholder="Find product or SKU..."
                placeholderTextColor={Colors.muted}
                value={search}
                onChangeText={setSearch}
              />
              {isFetching && !isFetchingNextPage ? (
                <ActivityIndicator size="small" color={Colors.primary} className="mr-2" />
              ) : search.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearch("")}
                  className="bg-white/5 p-2 rounded-full"
                >
                  <X size={16} color={Colors.muted} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
            progressBackgroundColor={Colors.card}
          />
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-24">
            <View className="bg-card w-28 h-28 rounded-[40px] items-center justify-center mb-8 border border-border shadow-3xl">
              <Boxes size={48} color={Colors.muted} />
            </View>
            <Text className="text-white text-2xl font-black mb-3">No Results</Text>
            <Text className="text-muted text-center px-12 leading-6 text-lg">
              We couldn't find any products matching your current search criteria.
            </Text>
            <TouchableOpacity
              onPress={() => setSearch("")}
              className="mt-8 bg-primary/10 px-8 py-4 rounded-2xl border border-primary/20"
            >
              <Text className="text-primary font-bold">Clear Filters</Text>
            </TouchableOpacity>
          </View>
        }
      />
      <Modal
        animationType="slide"
        transparent={true}
        visible={restockModalVisible}
        onRequestClose={() => setRestockModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="w-full"
          >
            <View className="bg-card rounded-t-[40px] p-8 border-t border-border">
              <View className="flex-row justify-between items-center mb-8">
                <View>
                  <Text className="text-white text-2xl font-bold">Restock Product</Text>
                  <Text className="text-muted text-sm mt-1">Enter the quantity to add to current stock</Text>
                </View>
                <TouchableOpacity onPress={() => setRestockModalVisible(false)}>
                  <X size={24} color={Colors.muted} />
                </TouchableOpacity>
              </View>

              <View className="space-y-6">
                <View>
                  <Text className="text-muted text-[10px] uppercase font-bold tracking-widest mb-3">Quantity to Add</Text>
                  <View className="bg-background border border-border rounded-2xl px-5 h-16 justify-center">
                    <TextInput
                      className="text-white text-xl font-bold"
                      placeholder="e.g. 50"
                      placeholderTextColor={Colors.muted}
                      value={restockAmount}
                      onChangeText={setRestockAmount}
                      keyboardType="numeric"
                      autoFocus
                    />
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleRestock}
                  disabled={restockMutation.isPending || !restockAmount.trim()}
                  className={`h-16 rounded-2xl items-center justify-center shadow-xl mt-4 ${restockMutation.isPending || !restockAmount.trim() ? "bg-primary/50" : "bg-primary"
                    }`}
                >
                  {restockMutation.isPending ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white text-lg font-bold">Update Inventory</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Edit Product Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="w-full"
          >
            <View className="bg-card rounded-t-[40px] p-8 border-t border-border">
              <View className="flex-row justify-between items-center mb-8">
                <View>
                  <Text className="text-white text-2xl font-bold">Edit Product</Text>
                  <Text className="text-muted text-sm mt-1">Update price or stock level directly</Text>
                </View>
                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                  <X size={24} color={Colors.muted} />
                </TouchableOpacity>
              </View>

              <View className="space-y-6">
                <View className="flex-row gap-4">
                  <View className="flex-1">
                    <Text className="text-muted text-[10px] uppercase font-bold tracking-widest mb-3">Price (₹)</Text>
                    <View className="bg-background border border-border rounded-2xl px-5 h-16 justify-center">
                      <TextInput
                        className="text-white text-xl font-bold"
                        placeholder="Price"
                        placeholderTextColor={Colors.muted}
                        value={editPrice}
                        onChangeText={setEditPrice}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                  <View className="flex-1">
                    <Text className="text-muted text-[10px] uppercase font-bold tracking-widest mb-3">Total Stock</Text>
                    <View className="bg-background border border-border rounded-2xl px-5 h-16 justify-center">
                      <TextInput
                        className="text-white text-xl font-bold"
                        placeholder="Stock"
                        placeholderTextColor={Colors.muted}
                        value={editStock}
                        onChangeText={setEditStock}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleUpdateProduct}
                  disabled={updateProductMutation.isPending}
                  className={`h-16 rounded-2xl items-center justify-center shadow-xl mt-4 ${updateProductMutation.isPending ? "bg-primary/50" : "bg-primary"
                    }`}
                >
                  {updateProductMutation.isPending ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white text-lg font-bold">Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Create Product Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={createModalVisible}
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="w-full"
          >
            <View className="bg-card rounded-t-[40px] p-8 border-t border-border max-h-[90%]">
              <View className="flex-row justify-between items-center mb-8">
                <View>
                  <Text className="text-white text-2xl font-bold">New Product</Text>
                  <Text className="text-muted text-sm mt-1">Add a new item to your catalog</Text>
                </View>
                <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                  <X size={24} color={Colors.muted} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="space-y-6 pb-10">
                  <View className="mb-6">
                    <Text className="text-muted text-[10px] uppercase font-bold tracking-widest mb-3">Product Name *</Text>
                    <View className="bg-background border border-border rounded-2xl px-5 h-16 justify-center">
                      <TextInput
                        className="text-white text-lg"
                        placeholder="e.g. Wireless Headphones"
                        placeholderTextColor={Colors.muted}
                        value={newName}
                        onChangeText={setNewName}
                      />
                    </View>
                  </View>

                  <View className="mb-6">
                    <Text className="text-muted text-[10px] uppercase font-bold tracking-widest mb-3">SKU *</Text>
                    <View className="flex-row gap-3">
                      <View className="flex-1 bg-background border border-border rounded-2xl px-5 h-16 justify-center">
                        <TextInput
                          className="text-white text-lg font-mono"
                          placeholder="SKU-XXXXXX"
                          placeholderTextColor={Colors.muted}
                          value={newSku}
                          onChangeText={setNewSku}
                        />
                      </View>
                      <TouchableOpacity
                        onPress={generateSku}
                        className="bg-white/5 border border-white/10 px-6 rounded-2xl items-center justify-center"
                      >
                        <Text className="text-primary font-bold">Generate</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View className="flex-row gap-4 mb-6">
                    <View className="flex-1">
                      <Text className="text-muted text-[10px] uppercase font-bold tracking-widest mb-3">Price (₹) *</Text>
                      <View className="bg-background border border-border rounded-2xl px-5 h-16 justify-center">
                        <TextInput
                          className="text-white text-xl font-bold"
                          placeholder="0.00"
                          placeholderTextColor={Colors.muted}
                          value={newPrice}
                          onChangeText={setNewPrice}
                          keyboardType="numeric"
                        />
                      </View>
                    </View>
                    <View className="flex-1">
                      <Text className="text-muted text-[10px] uppercase font-bold tracking-widest mb-3">Initial Stock</Text>
                      <View className="bg-background border border-border rounded-2xl px-5 h-16 justify-center">
                        <TextInput
                          className="text-white text-xl font-bold"
                          placeholder="0"
                          placeholderTextColor={Colors.muted}
                          value={newStock}
                          onChangeText={setNewStock}
                          keyboardType="numeric"
                        />
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={handleCreateProduct}
                    disabled={createProductMutation.isPending}
                    className={`h-16 rounded-2xl items-center justify-center shadow-xl mb-10 ${createProductMutation.isPending ? "bg-emerald-500/50" : "bg-emerald-500"
                      }`}
                  >
                    {createProductMutation.isPending ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="text-white text-lg font-bold">Create Product</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

import { View, Text, FlatList, ActivityIndicator, RefreshControl, Modal, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Linking, useWindowDimensions } from "react-native";
import { StatusBar } from "expo-status-bar";
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { DatePickerInput } from '../components/DatePickerInput';

import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from "@tanstack/react-query";


import api from "../services/api";
import { CheckCircle2, Circle, Zap, Search, Calendar, Plus, X, CalendarDays, ChevronRight, ShoppingCart, Package, Minus, Check, Users, Phone, Mail, Building2, FileText, Info } from "lucide-react-native";

import { Colors } from "../constants/Colors";
import { format } from "date-fns";
import React, { useState, useRef } from "react";
import Toast from 'react-native-toast-message';
import { LeadSkeleton } from "../components/Skeleton";

interface Lead {
  id: string;
  customer_name: string;
  phone: string;
  email: string;
  company?: string;
  source?: 'WALK_IN' | 'REFERRAL' | 'ONLINE' | 'COLD_CALL' | 'OTHER';
  notes?: string;
  status: "NEW" | "CONVERTED";
  createdAt: string;
  assigned_to?: string;
  assignee?: { id: string; name: string; email: string; role: string };
}

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
}

const LeadItem = React.memo(({ lead, onConvert, onAssign, onDetail, isAdmin, isLargeDevice }: { lead: Lead, onConvert: (id: string) => void, onAssign: (lead: Lead) => void, onDetail: (lead: Lead) => void, isAdmin: boolean, isLargeDevice: boolean }) => {
  const isConverted = lead.status === "CONVERTED";

  const handleCall = () => {
    if (lead.phone) Linking.openURL(`tel:${lead.phone}`);
  };

  const handleEmail = () => {
    if (lead.email) Linking.openURL(`mailto:${lead.email}`);
  };

  return (
    <View className="bg-card border border-border p-5 rounded-3xl mb-4 shadow-sm">
      <View className="flex-row justify-between items-start mb-4">
        <TouchableOpacity 
          className="flex-1 mr-3"
          onPress={() => onDetail(lead)}
        >
          <Text className="text-white text-lg font-bold" numberOfLines={1}>
            {lead.customer_name}
          </Text>
          {(lead.phone || lead.email) && (
            <View className="flex-row items-center mt-1 flex-wrap gap-x-3">
              {lead.phone && <Text className="text-muted-foreground text-xs">{lead.phone}</Text>}
              {lead.email && <Text className="text-muted-foreground text-xs" numberOfLines={1}>{lead.email}</Text>}
            </View>
          )}
          <View className="flex-row items-center mt-1 flex-wrap gap-x-2">
            <Calendar size={12} color={Colors.muted} />
            <Text className="text-muted-foreground text-xs ml-1">
              {format(new Date(lead.createdAt), "MMM dd, yyyy")}
            </Text>
            {lead.company && (
              <Text className="text-muted-foreground text-xs">• {lead.company}</Text>
            )}
            {lead.source && lead.source !== 'OTHER' && (
              <View className="bg-white/5 px-2 py-0.5 rounded-md">
                <Text className="text-muted-foreground text-[10px] font-bold uppercase">{lead.source.replace('_', ' ')}</Text>
              </View>
            )}
          </View>
          {lead.assignee && (
            <View className="flex-row items-center mt-2">
              <View className="bg-violet-500/10 px-2 py-0.5 rounded-md flex-row items-center">
                <Text className="text-violet-400 text-[10px] font-bold uppercase">Rep: {lead.assignee.name}</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>

        {/* Status Badge */}
        <View
          className={`flex-row items-center px-3 py-1.5 rounded-full ${isConverted ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-blue-500/10 border border-blue-500/20"
            }`}
        >
          {isConverted ? (
            <CheckCircle2 size={14} color="#10b981" />
          ) : (
            <Circle size={14} color="#3b82f6" />
          )}
          <Text
            className={`text-xs font-bold ml-1.5 ${isConverted ? "text-emerald-500" : "text-blue-500"
              }`}
          >
            {lead.status}
          </Text>
        </View>
      </View>

      <View className="flex-row gap-3">
        {isLargeDevice && (
          <>
            <TouchableOpacity
              onPress={handleCall}
              className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl items-center justify-center"
            >
              <Phone size={18} color="#10b981" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleEmail}
              className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 rounded-2xl items-center justify-center"
            >
              <Mail size={18} color="#3b82f6" />
            </TouchableOpacity>
          </>
        )}

        {!isConverted && (
          <TouchableOpacity
            onPress={() => onConvert(lead.id)}
            className="flex-1 bg-primary/10 border border-primary/20 h-12 rounded-2xl flex-row items-center justify-center"
          >
            <ShoppingCart size={16} color={Colors.primary} />
            <Text className="text-primary font-bold ml-2">Order</Text>
          </TouchableOpacity>
        )}

        {isAdmin && !isConverted && (
          <TouchableOpacity
            onPress={() => onAssign(lead)}
            className="bg-white/5 border border-white/10 px-4 h-12 rounded-2xl flex-row items-center justify-center"
          >
            <Users size={16} color={Colors.muted} />
            <Text className="text-muted font-bold ml-2">{lead.assigned_to ? "Reassign" : "Assign"}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

export default function CRM() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canConvert = ["admin", "sales"].includes(user?.role?.toLowerCase() || "");

  const [modalVisible, setModalVisible] = useState(false);
  // Create Lead form state
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [source, setSource] = useState<'WALK_IN' | 'REFERRAL' | 'ONLINE' | 'COLD_CALL' | 'OTHER'>('OTHER');
  const [notes, setNotes] = useState("");
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(user?.id || null);
  const [staffSearch, setStaffSearch] = useState("");
  const [debouncedStaffSearch, setDebouncedStaffSearch] = useState("");
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [leadToAssign, setLeadToAssign] = useState<Lead | null>(null);

  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedDetailLead, setSelectedDetailLead] = useState<Lead | null>(null);

  // Debounce logic for staff search
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedStaffSearch(staffSearch);
    }, 500);
    return () => clearTimeout(handler);
  }, [staffSearch]);

  const { data: staffData, isLoading: isStaffLoading } = useQuery({
    queryKey: ["sales-staff", user?.id, debouncedStaffSearch],
    queryFn: async () => {
      const response = await api.get("/leads/sales-staff", {
        params: { search: debouncedStaffSearch || undefined }
      });
      return response.data;
    },
    // Don't search until the user types something to protect server
    enabled: (modalVisible || assignModalVisible) && user?.role?.toLowerCase() === "admin" && debouncedStaffSearch.length > 0,
  });

  // Filter States
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string | null>(null); // null = ALL, "NEW", "CONVERTED"
  const [dateRange, setDateRange] = useState<{ start: string | null; end: string | null }>({ start: null, end: null });
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [tempDateRange, setTempDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });




  const {
    data: infiniteData,
    isLoading,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ["leads", user?.id, search, status, dateRange],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      const response = await api.get("/leads", {
        params: {
          search: search || undefined,
          status: status || undefined,
          startDate: dateRange.start || undefined,
          endDate: dateRange.end || undefined,
          limit: 10,
          offset: pageParam,
        }
      });
      return response.data;
    },
    getNextPageParam: (lastPage) => {
      const { offset, limit, totalItems } = lastPage.meta;
      const nextOffset = (offset || 0) + (limit || 10);
      return nextOffset < totalItems ? nextOffset : undefined;
    },
  });

  const leads = infiniteData?.pages.flatMap(page => page.data) || [];
  const totalLeads = infiniteData?.pages[0]?.meta?.totalItems || 0;

  const [convertModalVisible, setConvertModalVisible] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  // Multi-item selection state: Map of productId -> quantity
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  // Inventory Filtering inside Modal
  const [invSearch, setInvSearch] = useState("");
  const [invPage, setInvPage] = useState(0);

  const { data: inventoryData, isLoading: isInventoryLoading } = useQuery({
    queryKey: ["inventory", user?.id, invSearch, invPage],
    queryFn: async () => {
      const response = await api.get("/warehouse/inventory", {
        params: {
          search: invSearch || undefined,
          limit: 5,
          offset: invPage,
        }
      });
      return response.data;
    },
    enabled: convertModalVisible,
  });

  const convertLeadMutation = useMutation({
    mutationFn: async (payload: { leadId: string, items: { productId: string, quantity: number }[] }) => {
      const response = await api.post("/orders/convert", payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ["inventory"], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ["dashboard"], refetchType: 'all' });
      setConvertModalVisible(false);
      setSelectedItems({});
      setInvSearch("");
      setInvPage(0);
      Toast.show({
        type: 'success',
        text1: 'Order Created',
        text2: 'Lead has been successfully converted to an order.'
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Conversion Failed',
        text2: error.response?.data?.error || 'Something went wrong.'
      });
    }
  });

  const assignLeadMutation = useMutation({
    mutationFn: async ({ leadId, staffId }: { leadId: string, staffId: string }) => {
      const response = await api.patch(`/leads/${leadId}/assign`, { assigned_to: staffId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setAssignModalVisible(false);
      setLeadToAssign(null);
      setStaffSearch("");
      Toast.show({
        type: 'success',
        text1: 'Lead Assigned',
        text2: 'The lead has been successfully assigned to the sales rep.'
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Assignment Failed',
        text2: error.response?.data?.error || 'Something went wrong.'
      });
    }
  });

  const handleConvertLead = () => {
    if (!selectedLeadId || Object.keys(selectedItems).length === 0) return;

    const items = Object.entries(selectedItems).map(([productId, quantity]) => ({
      productId,
      quantity
    }));

    convertLeadMutation.mutate({
      leadId: selectedLeadId,
      items
    });
  };

  const toggleProduct = (productId: string) => {
    setSelectedItems(prev => {
      const next = { ...prev };
      if (next[productId]) {
        delete next[productId];
      } else {
        next[productId] = 1;
      }
      return next;
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setSelectedItems(prev => {
      const current = prev[productId] || 0;
      const next = Math.max(1, current + delta);
      return { ...prev, [productId]: next };
    });
  };

  const setQuantity = (productId: string, value: string) => {
    const num = parseInt(value);
    setSelectedItems(prev => ({
      ...prev,
      [productId]: isNaN(num) ? 0 : Math.max(0, num)
    }));
  };




  const createLeadMutation = useMutation({
    mutationFn: async (payload: {
      customer_name: string;
      phone: string;
      email: string;
      company?: string;
      source?: string;
      notes?: string;
      assigned_to?: string;
    }) => {
      const response = await api.post("/leads", payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ["dashboard"], refetchType: 'all' });
      setSearch("");
      setStatus(null);
      setDateRange({ start: null, end: null });
      setModalVisible(false);
      // Reset form
      setCustomerName("");
      setPhone("");
      setEmail("");
      setCompany("");
      setSource('OTHER');
      setNotes("");
      setFormErrors([]);
      setSelectedStaffId(user?.id || null);
      setStaffSearch("");
      Toast.show({
        type: 'success',
        text1: 'Lead Created',
        text2: 'New lead has been added to the pipeline.'
      });
    },
    onError: (error: any) => {
      const serverErrors: string[] = error.response?.data?.errors || [];
      if (serverErrors.length > 0) {
        setFormErrors(serverErrors);
      } else {
        Toast.show({ type: 'error', text1: 'Failed', text2: error.response?.data?.error || 'Something went wrong.' });
      }
    }
  });


  const handleCreateLead = () => {
    const errors: string[] = [];
    if (!customerName.trim()) errors.push('customer_name is required');
    if (!phone.trim()) errors.push('phone is required');
    if (!email.trim()) errors.push('email is required');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email.trim() && !emailRegex.test(email.trim())) errors.push('email format is invalid');
    if (errors.length > 0) { setFormErrors(errors); return; }
    setFormErrors([]);
    createLeadMutation.mutate({
      customer_name: customerName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      company: company.trim() || undefined,
      source,
      notes: notes.trim() || undefined,
      assigned_to: selectedStaffId || undefined
    });
  };

  const { width } = useWindowDimensions();
  const isLargeDevice = width > 768;

  if (isLoading && !isRefetching) {
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
      <StatusBar style="light" backgroundColor={Colors.background} />

      <FlatList
        data={leads}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <LeadItem
            lead={item}
            isAdmin={user?.role?.toLowerCase() === "admin"}
            onConvert={(id) => {
              setSelectedLeadId(id);
              setConvertModalVisible(true);
            }}
            onAssign={(lead) => {
              setLeadToAssign(lead);
              setSelectedStaffId(lead.assigned_to || null);
              setAssignModalVisible(true);
            }}
            onDetail={(lead) => {
              setSelectedDetailLead(lead);
              setDetailModalVisible(true);
            }}
            isLargeDevice={isLargeDevice}
          />
        )}

        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 48, paddingBottom: 100 }}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View className="py-6">
              <ActivityIndicator color={Colors.primary} />
            </View>
          ) : null
        }

        ListHeaderComponent={
          <View className="mb-8">
            <View className="flex-row justify-between items-start mb-8">
              <View className="flex-1">
                <Text className="text-primary font-medium tracking-widest uppercase mb-2">Lead Management</Text>
                <Text className="text-white text-5xl font-extrabold tracking-tight">Leads</Text>
                <Text className="text-gray-400 text-lg mt-4 leading-8">
                  You have {totalLeads} active leads in the pipeline.
                </Text>

              </View>
              {canConvert && (
                <View className="bg-primary/20 p-4 rounded-3xl border border-primary/20">
                  <Zap size={28} color={Colors.primary} />
                </View>
              )}
            </View>

            {/* Search Bar */}
            <View className="bg-card border border-border rounded-2xl flex-row items-center px-4 h-14 mb-6">
              <Search size={20} color={Colors.muted} />
              <TextInput
                className="flex-1 text-white ml-3 text-base"
                placeholder="Search leads..."
                placeholderTextColor={Colors.muted}
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch("")}>
                  <X size={18} color={Colors.muted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Status Filters */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-6">
              {[
                { label: "All Leads", value: null },
                { label: "New", value: "NEW" },
                { label: "Converted", value: "CONVERTED" },
              ].map((tab) => (
                <TouchableOpacity
                  key={tab.label}
                  onPress={() => setStatus(tab.value)}
                  className={`mr-3 px-6 py-3 rounded-full border ${status === tab.value
                    ? "bg-primary border-primary"
                    : "bg-card border-border"
                    }`}
                >
                  <Text className={`font-bold ${status === tab.value ? "text-white" : "text-muted-foreground"}`}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Date Filters */}
            <View className="flex-row items-center">
              <Calendar size={16} color={Colors.muted} className="mr-3" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                {[
                  { label: "All Time", start: null },
                  { label: "Last 7 Days", start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() },
                  { label: "Last 30 Days", start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
                ].map((preset) => {
                  const isActive = dateRange.start === preset.start && !dateRange.end;
                  return (
                    <TouchableOpacity
                      key={preset.label}
                      onPress={() => setDateRange({ start: preset.start, end: null })}
                      className={`mr-2 px-4 py-2 rounded-xl border ${isActive
                        ? "bg-primary/20 border-primary/40"
                        : "bg-card/50 border-border/50"
                        }`}
                    >
                      <Text className={`text-xs font-semibold ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                        {preset.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                {/* Custom Button */}
                <TouchableOpacity
                  onPress={() => setDateModalVisible(true)}
                  className={`px-4 py-2 rounded-xl border flex-row items-center ${dateRange.end || (dateRange.start && !["All Time", "Last 7 Days", "Last 30 Days"].includes(leads?.find(l => l.createdAt)?.createdAt || ""))
                    ? "bg-primary/20 border-primary/40"
                    : "bg-card/50 border-border/50"
                    }`}
                >
                  <CalendarDays size={14} color={dateRange.end ? Colors.primary : Colors.muted} className="mr-2" />
                  <Text className={`text-xs font-semibold ${dateRange.end ? "text-primary" : "text-muted-foreground"}`}>
                    Custom Range
                  </Text>
                </TouchableOpacity>
              </ScrollView>
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
          <View className="items-center justify-center py-20">
            <View className="bg-card w-24 h-24 rounded-3xl items-center justify-center mb-6 border border-border shadow-2xl">
              <Search size={40} color={Colors.muted} />
            </View>
            <Text className="text-white text-2xl font-bold mb-2">No leads found</Text>
            <Text className="text-gray-400 text-center px-10 leading-6">
              The pipeline is empty. Pull down to refresh or check your filters.
            </Text>
          </View>
        }
      />

      {/* FAB */}
      {canConvert && (
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          className="absolute bottom-10 right-6 w-16 h-16 bg-primary rounded-full items-center justify-center shadow-2xl shadow-primary/50"
          activeOpacity={0.8}
        >
          <Plus size={32} color="white" />
        </TouchableOpacity>
      )}

      {/* Add Lead Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="w-full"
          >
            <View className="bg-card rounded-t-[40px] p-8 border-t border-border">
              <View className="flex-row justify-between items-center mb-8">
                <Text className="text-white text-2xl font-bold">New Lead</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <X size={24} color={Colors.muted} />
                </TouchableOpacity>
              </View>

              {/* Validation errors */}
              {formErrors.length > 0 && (
                <View className="bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-3 mb-2">
                  {formErrors.map((e, i) => (
                    <Text key={i} className="text-red-400 text-xs font-medium">{e}</Text>
                  ))}
                </View>
              )}

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
                <View className="space-y-5">

                  {/* Customer Name */}
                  <View>
                    <Text className="text-muted-foreground text-xs font-bold mb-2 uppercase tracking-widest">Customer Name <Text className="text-red-400">*</Text></Text>
                    <View className="bg-background border border-border rounded-2xl px-4 h-14 justify-center">
                      <TextInput
                        className="text-white text-base"
                        placeholder="Full name of contact person"
                        placeholderTextColor={Colors.muted}
                        value={customerName}
                        onChangeText={setCustomerName}
                      />
                    </View>
                  </View>

                  {/* Phone */}
                  <View>
                    <Text className="text-muted-foreground text-xs font-bold mb-2 uppercase tracking-widest">Phone <Text className="text-red-400">*</Text></Text>
                    <View className="bg-background border border-border rounded-2xl px-4 h-14 justify-center">
                      <TextInput
                        className="text-white text-base"
                        placeholder="+91 98765 43210"
                        placeholderTextColor={Colors.muted}
                        keyboardType="phone-pad"
                        value={phone}
                        onChangeText={setPhone}
                      />
                    </View>
                  </View>

                  {/* Email */}
                  <View>
                    <Text className="text-muted-foreground text-xs font-bold mb-2 uppercase tracking-widest">Email <Text className="text-red-400">*</Text></Text>
                    <View className="bg-background border border-border rounded-2xl px-4 h-14 justify-center">
                      <TextInput
                        className="text-white text-base"
                        placeholder="jane@example.com"
                        placeholderTextColor={Colors.muted}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={email}
                        onChangeText={setEmail}
                      />
                    </View>
                  </View>

                  {/* Company (optional) */}
                  <View>
                    <Text className="text-muted-foreground text-xs font-bold mb-2 uppercase tracking-widest">Company <Text className="text-muted">(optional)</Text></Text>
                    <View className="bg-background border border-border rounded-2xl px-4 h-14 justify-center">
                      <TextInput
                        className="text-white text-base"
                        placeholder="Acme Corp"
                        placeholderTextColor={Colors.muted}
                        value={company}
                        onChangeText={setCompany}
                      />
                    </View>
                  </View>

                  {/* Source (optional) */}
                  <View>
                    <Text className="text-muted-foreground text-xs font-bold mb-2 uppercase tracking-widest">Lead Source <Text className="text-muted">(optional)</Text></Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View className="flex-row gap-2">
                        {(['WALK_IN', 'REFERRAL', 'ONLINE', 'COLD_CALL', 'OTHER'] as const).map((s) => (
                          <TouchableOpacity
                            key={s}
                            onPress={() => setSource(s)}
                            className={`px-4 py-2.5 rounded-xl border ${source === s ? 'bg-primary border-primary' : 'bg-background border-border'
                              }`}
                          >
                            <Text className={`text-xs font-bold ${source === s ? 'text-white' : 'text-muted-foreground'
                              }`}>{s.replace('_', ' ')}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>

                  {/* Notes (optional) */}
                  <View>
                    <Text className="text-muted-foreground text-xs font-bold mb-2 uppercase tracking-widest">Notes <Text className="text-muted">(optional)</Text></Text>
                    <View className="bg-background border border-border rounded-2xl px-4 py-3">
                      <TextInput
                        className="text-white text-base"
                        placeholder="Free-form notes about the lead..."
                        placeholderTextColor={Colors.muted}
                        multiline
                        numberOfLines={3}
                        value={notes}
                        onChangeText={setNotes}
                        style={{ minHeight: 72, textAlignVertical: 'top' }}
                      />
                    </View>
                  </View>

                  {/* Sales Assignment (Admin Only) */}
                  {user?.role?.toLowerCase() === "admin" && (
                    <View>
                      <Text className="text-muted-foreground text-xs font-bold mb-2 uppercase tracking-widest">Assign To Sales Team <Text className="text-muted">(optional)</Text></Text>
                      <View className="bg-background border border-border rounded-2xl px-4 h-12 flex-row items-center mb-3">
                        <Search size={16} color={Colors.muted} />
                        <TextInput
                          className="flex-1 text-white ml-2 text-sm"
                          placeholder="Filter staff..."
                          placeholderTextColor={Colors.muted}
                          value={staffSearch}
                          onChangeText={setStaffSearch}
                        />
                      </View>
                      <ScrollView className="max-h-48" showsVerticalScrollIndicator={false}>
                        {staffSearch.length === 0 ? (
                          <View className="py-6 items-center border border-dashed border-border rounded-2xl">
                            <Search size={20} color={Colors.muted} />
                            <Text className="text-muted text-xs mt-2 font-medium">Search to see sales staff...</Text>
                          </View>
                        ) : isStaffLoading ? (
                          <ActivityIndicator color={Colors.primary} className="py-4" />
                        ) : staffData?.data?.length === 0 ? (
                          <View className="py-6 items-center">
                            <Text className="text-muted text-xs font-medium">No staff found matching "{staffSearch}"</Text>
                          </View>
                        ) : (
                          staffData?.data?.map((staff: any) => (
                            <TouchableOpacity
                              key={staff.id}
                              onPress={() => setSelectedStaffId(staff.id)}
                              className={`flex-row items-center justify-between p-4 mb-2 rounded-2xl border ${selectedStaffId === staff.id ? "bg-primary/10 border-primary/40" : "bg-background border-border/50"
                                }`}
                            >
                              <View className="flex-row items-center">
                                <View className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${selectedStaffId === staff.id ? "bg-primary" : "bg-card"
                                  }`}>
                                  <Text className="text-white text-xs font-bold">{staff.name.charAt(0)}</Text>
                                </View>
                                <View>
                                  <Text className={`font-bold ${selectedStaffId === staff.id ? "text-primary" : "text-white"}`}>{staff.name}</Text>
                                  <Text className="text-muted text-[10px]">{staff.leads_count} Leads • {staff.orders_count} Orders</Text>
                                </View>
                              </View>
                              {selectedStaffId === staff.id && <CheckCircle2 size={20} color={Colors.primary} />}
                            </TouchableOpacity>
                          ))
                        )}
                      </ScrollView>
                    </View>
                  )}

                  <TouchableOpacity
                    onPress={handleCreateLead}
                    disabled={createLeadMutation.isPending}
                    className={`h-16 rounded-2xl items-center justify-center shadow-xl ${createLeadMutation.isPending ? "bg-primary/50" : "bg-primary"
                      }`}
                  >
                    {createLeadMutation.isPending ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="text-white text-lg font-bold">Create Lead</Text>
                    )}
                  </TouchableOpacity>

                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
      {/* Date Filter Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={dateModalVisible}
        onRequestClose={() => setDateModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/70 px-6">
          <View className="bg-card w-full rounded-[40px] p-8 border border-border shadow-2xl">
            <View className="flex-row justify-between items-center mb-8">
              <View>
                <Text className="text-white text-2xl font-bold">Custom Range</Text>
                <Text className="text-muted-foreground text-sm">Select start and end dates</Text>
              </View>
              <TouchableOpacity onPress={() => setDateModalVisible(false)}>
                <X size={24} color={Colors.muted} />
              </TouchableOpacity>
            </View>

            <View className="space-y-6">
              <View>
                <Text className="text-muted-foreground text-xs font-bold mb-3 uppercase tracking-widest">Start Date</Text>
                <DatePickerInput
                  value={tempDateRange.start}
                  onChange={(d) => setTempDateRange(prev => ({ ...prev, start: d }))}
                  placeholder="Select Start Date"
                />
              </View>

              <View>
                <Text className="text-muted-foreground text-xs font-bold mb-3 uppercase tracking-widest">End Date</Text>
                <DatePickerInput
                  value={tempDateRange.end}
                  onChange={(d) => setTempDateRange(prev => ({ ...prev, end: d }))}
                  placeholder="Select End Date"
                />
              </View>

              <View className="flex-row gap-3 pt-4">
                <TouchableOpacity
                  onPress={() => {
                    setDateRange({ start: null, end: null });
                    setTempDateRange({ start: null, end: null });
                    setDateModalVisible(false);
                  }}
                  className="flex-1 h-14 rounded-2xl items-center justify-center border border-border bg-transparent"
                >
                  <Text className="text-white font-bold">Clear</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setDateRange({
                      start: tempDateRange.start ? format(tempDateRange.start, "yyyy-MM-dd") : null,
                      end: tempDateRange.end ? format(tempDateRange.end, "yyyy-MM-dd") : null
                    });
                    setDateModalVisible(false);
                  }}
                  className="flex-2 h-14 rounded-2xl items-center justify-center bg-primary px-10"
                >
                  <Text className="text-white font-bold text-lg">Apply Filter</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>


      </Modal>
      {/* Convert Lead to Order Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={convertModalVisible}
        onRequestClose={() => setConvertModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-card rounded-t-[40px] p-8 border-t border-border h-[85%]">
            <View className="flex-row justify-between items-center mb-6">
              <View>
                <Text className="text-white text-2xl font-bold">Convert to Order</Text>
                <Text className="text-muted-foreground text-sm">Select multiple products and set quantities</Text>
              </View>
              <TouchableOpacity onPress={() => setConvertModalVisible(false)}>
                <X size={24} color={Colors.muted} />
              </TouchableOpacity>
            </View>

            {/* Inventory Search */}
            <View className="bg-background border border-border rounded-2xl flex-row items-center px-4 h-12 mb-6">
              <Search size={18} color={Colors.muted} />
              <TextInput
                className="flex-1 text-white ml-3 text-sm"
                placeholder="Search inventory..."
                placeholderTextColor={Colors.muted}
                value={invSearch}
                onChangeText={(v) => {
                  setInvSearch(v);
                  setInvPage(0);
                }}
              />
            </View>

            <View className="flex-1">
              {/* Table Header */}
              <View className="flex-row items-center pb-3 border-b border-border px-2">
                <Text className="flex-1 text-muted-foreground text-[10px] font-bold uppercase tracking-widest">Product</Text>
                <Text className="w-16 text-center text-muted-foreground text-[10px] font-bold uppercase tracking-widest">Stock</Text>
                <Text className="w-24 text-center text-muted-foreground text-[10px] font-bold uppercase tracking-widest">Order Qty</Text>
              </View>

              <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                {isInventoryLoading ? (
                  <View className="py-10">
                    <ActivityIndicator color={Colors.primary} />
                  </View>
                ) : (
                  inventoryData?.data.map((product: InventoryItem) => {
                    const isSelected = !!selectedItems[product.id];
                    return (
                      <TouchableOpacity
                        key={product.id}
                        onPress={() => toggleProduct(product.id)}
                        className={`flex-row items-center py-4 px-2 border-b border-border/50 ${isSelected ? "bg-primary/5" : ""
                          }`}
                      >
                        {/* Product Info */}
                        <View className="flex-1 flex-row items-center">
                          <View className={`w-5 h-5 rounded-md border mr-3 items-center justify-center ${isSelected ? "bg-primary border-primary" : "border-muted/50"
                            }`}>
                            {isSelected && <Check size={12} color="white" />}
                          </View>
                          <View className="flex-1">
                            <Text className={`font-bold text-sm ${isSelected ? "text-primary" : "text-gray-300"}`} numberOfLines={1}>
                              {product.name}
                            </Text>
                            <Text className="text-muted-foreground text-[10px]">{product.sku}</Text>
                          </View>
                        </View>

                        {/* Stock */}
                        <Text className="w-16 text-center text-white text-xs font-medium">{product.quantity}</Text>

                        {/* Quantity Controls */}
                        <View className="w-24 flex-row items-center justify-center">
                          {isSelected ? (
                            <View className="flex-row items-center bg-background rounded-lg border border-border overflow-hidden">
                              <TouchableOpacity
                                onPress={() => updateQuantity(product.id, -1)}
                                className="p-1.5"
                              >
                                <Minus size={14} color="white" />
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => setEditingProductId(product.id)}
                                className="px-2 min-w-[32px] items-center justify-center"
                              >
                                {editingProductId === product.id ? (
                                  <TextInput
                                    className="text-primary font-bold text-xs w-full text-center p-0"
                                    keyboardType="numeric"
                                    value={selectedItems[product.id] === 0 ? "" : selectedItems[product.id].toString()}
                                    onChangeText={(v) => setQuantity(product.id, v)}
                                    autoFocus
                                    onBlur={() => {
                                      if (selectedItems[product.id] === 0) {
                                        setQuantity(product.id, "1");
                                      }
                                      setEditingProductId(null);
                                    }}
                                    onSubmitEditing={() => setEditingProductId(null)}
                                    selectTextOnFocus
                                  />
                                ) : (
                                  <Text className="text-primary font-bold text-xs">{selectedItems[product.id]}</Text>
                                )}
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => updateQuantity(product.id, 1)}
                                className="p-1.5"
                              >
                                <Plus size={14} color="white" />
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <Text className="text-muted-foreground text-[10px]">Select</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>

              {/* Inventory Pagination */}
              <View className="flex-row justify-between items-center py-4 border-t border-border mt-2">
                <TouchableOpacity
                  disabled={invPage === 0}
                  onPress={() => setInvPage(p => Math.max(0, p - 5))}
                  className={invPage === 0 ? "opacity-30" : ""}
                >
                  <Text className="text-primary text-xs font-bold">Previous</Text>
                </TouchableOpacity>
                <Text className="text-muted-foreground text-xs">
                  Showing {invPage + 1} - {invPage + (inventoryData?.data?.length || 0)}
                </Text>
                <TouchableOpacity
                  disabled={(inventoryData?.data?.length || 0) < 5}
                  onPress={() => setInvPage(p => p + 5)}
                  className={(inventoryData?.data?.length || 0) < 5 ? "opacity-30" : ""}
                >
                  <Text className="text-primary text-xs font-bold">Next</Text>
                </TouchableOpacity>
              </View>

              {/* Bottom Actions */}
              <View className="pt-4 flex-row gap-4">
                <View className="flex-1">
                  <Text className="text-muted-foreground text-[10px] font-bold uppercase mb-1">Total Items</Text>
                  <Text className="text-white text-xl font-extrabold">{Object.keys(selectedItems).length}</Text>
                </View>

                {(() => {
                  const hasInvalidQuantity = Object.values(selectedItems).some(q => q === 0);
                  const isDisabled = convertLeadMutation.isPending || Object.keys(selectedItems).length === 0 || hasInvalidQuantity;

                  return (
                    <TouchableOpacity
                      onPress={handleConvertLead}
                      disabled={isDisabled}
                      className={`flex-2 h-14 px-10 rounded-2xl items-center justify-center shadow-xl ${isDisabled ? "bg-primary/30" : "bg-primary"
                        }`}
                    >
                      {convertLeadMutation.isPending ? (
                        <ActivityIndicator color="white" />
                      ) : (
                        <Text className="text-white text-lg font-bold">
                          {hasInvalidQuantity ? "Fix Quantities" : "Convert Now"}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })()}
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Assign Lead Modal (Admin Only) */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={assignModalVisible}
        onRequestClose={() => setAssignModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-card rounded-t-[40px] p-8 border-t border-border h-[70%]">
            <View className="flex-row justify-between items-center mb-6">
              <View>
                <Text className="text-white text-2xl font-bold">Assign Lead</Text>
                <Text className="text-muted-foreground text-sm">Assign "{leadToAssign?.customer_name}" to a rep</Text>
              </View>
              <TouchableOpacity onPress={() => setAssignModalVisible(false)}>
                <X size={24} color={Colors.muted} />
              </TouchableOpacity>
            </View>

            {/* Staff Search */}
            <View className="bg-background border border-border rounded-2xl px-4 h-12 flex-row items-center mb-6">
              <Search size={18} color={Colors.muted} />
              <TextInput
                className="flex-1 text-white ml-3 text-sm"
                placeholder="Search sales staff..."
                placeholderTextColor={Colors.muted}
                value={staffSearch}
                onChangeText={setStaffSearch}
              />
            </View>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
              {staffSearch.length === 0 ? (
                <View className="py-12 items-center border border-dashed border-border rounded-[32px]">
                  <Users size={32} color={Colors.muted} />
                  <Text className="text-muted text-xs mt-3 font-medium">Search for a sales representative...</Text>
                </View>
              ) : isStaffLoading ? (
                <ActivityIndicator color={Colors.primary} className="py-8" />
              ) : (
                staffData?.data?.map((staff: any) => (
                  <TouchableOpacity
                    key={staff.id}
                    onPress={() => setSelectedStaffId(staff.id)}
                    className={`flex-row items-center justify-between p-5 mb-3 rounded-3xl border ${selectedStaffId === staff.id
                      ? "bg-primary/10 border-primary/40 shadow-sm"
                      : "bg-background border-border/50"
                      }`}
                  >
                    <View className="flex-row items-center">
                      <View className={`w-10 h-10 rounded-2xl items-center justify-center mr-4 ${selectedStaffId === staff.id ? "bg-primary shadow-lg shadow-primary/30" : "bg-card"
                        }`}>
                        <Text className="text-white font-bold">{staff.name.charAt(0)}</Text>
                      </View>
                      <View>
                        <Text className={`font-bold text-base ${selectedStaffId === staff.id ? "text-primary" : "text-white"}`}>
                          {staff.name}
                        </Text>
                        <Text className="text-muted text-[10px] uppercase font-black tracking-widest mt-1">
                          {staff.leads_count} Active Leads
                        </Text>
                      </View>
                    </View>
                    {selectedStaffId === staff.id && (
                      <View className="bg-primary/20 p-2 rounded-full">
                        <Check size={16} color={Colors.primary} />
                      </View>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <View className="pt-6">
              <TouchableOpacity
                onPress={() => {
                  if (leadToAssign && selectedStaffId) {
                    assignLeadMutation.mutate({ leadId: leadToAssign.id, staffId: selectedStaffId });
                  }
                }}
                disabled={!selectedStaffId || assignLeadMutation.isPending}
                className={`h-16 rounded-2xl items-center justify-center shadow-xl ${!selectedStaffId || assignLeadMutation.isPending ? "bg-primary/30" : "bg-primary"
                  }`}
              >
                {assignLeadMutation.isPending ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white text-lg font-bold">Confirm Assignment</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Lead Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={detailModalVisible}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-card rounded-t-[40px] p-8 border-t border-border max-h-[90%]">
            <View className="flex-row justify-between items-center mb-8">
              <View className="flex-row items-center">
                <View className="bg-primary/10 p-3 rounded-2xl mr-4">
                  <Info size={24} color={Colors.primary} />
                </View>
                <Text className="text-white text-2xl font-bold">Lead Details</Text>
              </View>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <X size={24} color={Colors.muted} />
              </TouchableOpacity>
            </View>

            {selectedDetailLead && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="space-y-6">
                  {/* Primary Info */}
                  <View className="items-center mb-4">
                    <View className="w-20 h-20 bg-primary/20 rounded-full items-center justify-center mb-4">
                      <Text className="text-primary text-3xl font-black">
                        {selectedDetailLead.customer_name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text className="text-white text-2xl font-bold text-center">{selectedDetailLead.customer_name}</Text>
                    <View className={`mt-2 px-3 py-1 rounded-full ${
                      selectedDetailLead.status === 'CONVERTED' ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-blue-500/10 border border-blue-500/20'
                    }`}>
                      <Text className={`text-xs font-bold ${
                        selectedDetailLead.status === 'CONVERTED' ? 'text-emerald-500' : 'text-blue-500'
                      }`}>{selectedDetailLead.status}</Text>
                    </View>
                  </View>

                  {/* Quick Actions */}
                  <View className="flex-row gap-4">
                    <TouchableOpacity 
                      onPress={() => Linking.openURL(`tel:${selectedDetailLead.phone}`)}
                      className="flex-1 bg-emerald-500 rounded-3xl h-16 flex-row items-center justify-center"
                    >
                      <Phone size={20} color="white" />
                      <Text className="text-white font-bold ml-2 text-lg">Call</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => Linking.openURL(`mailto:${selectedDetailLead.email}`)}
                      className="flex-1 bg-blue-500 rounded-3xl h-16 flex-row items-center justify-center"
                    >
                      <Mail size={20} color="white" />
                      <Text className="text-white font-bold ml-2 text-lg">Email</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Detail Grid */}
                  <View className="space-y-4 pt-4">
                    <View className="bg-background/50 border border-border p-4 rounded-3xl flex-row items-center">
                      <View className="bg-primary/10 p-2 rounded-xl mr-4">
                        <Phone size={18} color={Colors.primary} />
                      </View>
                      <View>
                        <Text className="text-muted text-[10px] font-bold uppercase mb-1">Phone Number</Text>
                        <Text className="text-white font-bold text-base">{selectedDetailLead.phone}</Text>
                      </View>
                    </View>

                    <View className="bg-background/50 border border-border p-4 rounded-3xl flex-row items-center">
                      <View className="bg-primary/10 p-2 rounded-xl mr-4">
                        <Mail size={18} color={Colors.primary} />
                      </View>
                      <View>
                        <Text className="text-muted text-[10px] font-bold uppercase mb-1">Email Address</Text>
                        <Text className="text-white font-bold text-base">{selectedDetailLead.email}</Text>
                      </View>
                    </View>

                    {selectedDetailLead.company && (
                      <View className="bg-background/50 border border-border p-4 rounded-3xl flex-row items-center">
                        <View className="bg-primary/10 p-2 rounded-xl mr-4">
                          <Building2 size={18} color={Colors.primary} />
                        </View>
                        <View>
                          <Text className="text-muted text-[10px] font-bold uppercase mb-1">Company Name</Text>
                          <Text className="text-white font-bold text-base">{selectedDetailLead.company}</Text>
                        </View>
                      </View>
                    )}

                    <View className="bg-background/50 border border-border p-4 rounded-3xl flex-row items-center">
                      <View className="bg-primary/10 p-2 rounded-xl mr-4">
                        <Zap size={18} color={Colors.primary} />
                      </View>
                      <View>
                        <Text className="text-muted text-[10px] font-bold uppercase mb-1">Lead Source</Text>
                        <Text className="text-white font-bold text-base">{selectedDetailLead.source || 'OTHER'}</Text>
                      </View>
                    </View>

                    <View className="bg-background/50 border border-border p-4 rounded-3xl flex-row items-center">
                      <View className="bg-primary/10 p-2 rounded-xl mr-4">
                        <Calendar size={18} color={Colors.primary} />
                      </View>
                      <View>
                        <Text className="text-muted text-[10px] font-bold uppercase mb-1">Created At</Text>
                        <Text className="text-white font-bold text-base">
                          {format(new Date(selectedDetailLead.createdAt), "MMMM dd, yyyy 'at' hh:mm a")}
                        </Text>
                      </View>
                    </View>

                    {selectedDetailLead.notes && (
                      <View className="bg-background/50 border border-border p-4 rounded-3xl">
                        <View className="flex-row items-center mb-3">
                          <View className="bg-primary/10 p-2 rounded-xl mr-4">
                            <FileText size={18} color={Colors.primary} />
                          </View>
                          <Text className="text-muted text-[10px] font-bold uppercase">Internal Notes</Text>
                        </View>
                        <Text className="text-gray-300 leading-6">{selectedDetailLead.notes}</Text>
                      </View>
                    )}

                    {selectedDetailLead.assignee && (
                      <View className="bg-violet-500/5 border border-violet-500/20 p-4 rounded-3xl flex-row items-center">
                        <View className="bg-violet-500/20 p-2 rounded-xl mr-4">
                          <Users size={18} color="#a78bfa" />
                        </View>
                        <View>
                          <Text className="text-violet-400 text-[10px] font-bold uppercase mb-1">Assigned Sales Rep</Text>
                          <Text className="text-white font-bold text-base">{selectedDetailLead.assignee.name}</Text>
                        </View>
                      </View>
                    )}
                  </View>

                  <View className="pb-10"></View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}



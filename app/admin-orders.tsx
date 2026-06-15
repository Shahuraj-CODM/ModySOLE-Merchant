import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
  ScrollView, Alert, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import io, { Socket } from 'socket.io-client';
import Constants from 'expo-constants';
import api from '../lib/api';
import { useAuthStore } from '../lib/store/authStore';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';

const API_URL = (Constants.expoConfig?.extra?.apiUrl as string) || 'http://localhost:5000';

const STATUS_COLORS: Record<string, string> = {
  pending: Colors.warning,
  confirmed: Colors.info,
  packed: Colors.info,
  shipped: Colors.gold,
  out_for_delivery: Colors.gold,
  delivered: Colors.success,
  cancelled: Colors.error,
};

export default function AdminOrdersScreen() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);
  
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Fetch admin orders
  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => api.get('/api/orders/all-admin').then((r) => r.data.orders),
  });

  // Socket.io for live updates
  useEffect(() => {
    const socket = io(API_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsLiveConnected(true);
    });

    socket.on('disconnect', () => {
      setIsLiveConnected(false);
    });

    // Listen to live updates of orders
    socket.on('order_update', (payload: { orderId: string; status: string }) => {
      console.log('Admin Mobile Live Update Received:', payload);
      refetch();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Filter and search logic
  const filteredOrders = (orders || []).filter((o: any) => {
    // Tab Filter
    if (filter !== 'all') {
      if (filter === 'pending') {
        if (o.status !== 'pending' && o.status !== 'confirmed') return false;
      } else {
        if (o.status !== filter) return false;
      }
    }
    
    // Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchId = o.id.toLowerCase().includes(q);
      const matchName = o.user_name && o.user_name.toLowerCase().includes(q);
      const matchEmail = o.user_email && o.user_email.toLowerCase().includes(q);
      return matchId || matchName || matchEmail;
    }
    
    return true;
  });

  // Calculations
  const totalOrders = orders?.length ?? 0;
  const activeOrders = orders?.filter((o: any) => 
    ['pending', 'confirmed', 'packed', 'shipped', 'out_for_delivery'].includes(o.status)
  ).length ?? 0;
  
  const totalRevenue = orders
    ?.filter((o: any) => o.status !== 'cancelled')
    .reduce((sum: number, o: any) => sum + parseFloat(o.total || 0), 0) ?? 0;

  // Administrative Actions
  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out of the Merchant Portal?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          logout();
          router.replace('/(auth)/login');
        }
      }
    ]);
  };

  const handleCancelOrder = async (orderId: string) => {
    const order = orders?.find((o: any) => o.id === orderId);
    if (!order) return;

    // Calculate cancel fee estimation locally
    const createdTime = new Date(order.created_at);
    const now = new Date();
    const diffMins = (now.getTime() - createdTime.getTime()) / (1000 * 60);
    
    let shoesPrice = 0;
    if (order.items) {
      order.items.forEach((item: any) => {
        if (item.product_name.toLowerCase().includes('base') || item.product_name.toLowerCase().includes('bundle')) {
          shoesPrice += parseFloat(item.total_price || 0);
        }
      });
    }
    const cancelCharge = diffMins <= 30 ? 0 : shoesPrice * 0.5;
    const policyMsg = diffMins <= 30 
      ? 'Order is within 30 minutes grace period. Free cancellation (₹0 fee).'
      : `Order is past 30 minutes. 50% cancellation fee applied (₹${cancelCharge.toFixed(2)}).`;

    Alert.alert(
      'Confirm Cancellation',
      `Cancel order #${orderId.slice(-8).toUpperCase()}?\n\nElapsed: ${Math.floor(diffMins)}m\n${policyMsg}`,
      [
        { text: 'Back', style: 'cancel' },
        {
          text: 'Confirm Cancel',
          style: 'destructive',
          onPress: async () => {
            setActionLoadingId(orderId);
            try {
              const res = await api.post(`/api/orders/${orderId}/cancel-admin`);
              if (res.data.success) {
                Alert.alert('Cancelled', 'Order has been successfully cancelled.');
                refetch();
              }
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.error || 'Could not cancel order');
            } finally {
              setActionLoadingId(null);
            }
          }
        }
      ]
    );
  };

  const handleFastForward = async (orderId: string) => {
    setActionLoadingId(orderId);
    try {
      const res = await api.patch(`/api/orders/${orderId}/fast-forward`, { minutes: 60 });
      if (res.data.success) {
        Alert.alert('Time Shifted', 'Order creation time shifted back by 1 hour. Scheduler updated.');
        setTimeout(() => {
          refetch();
          setActionLoadingId(null);
        }, 800);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Could not shift time');
      setActionLoadingId(null);
    }
  };

  const toggleExpand = (orderId: string) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color={Colors.error} />
        </TouchableOpacity>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>Merchant Portal</Text>
          <View style={styles.liveIndicator}>
            <View style={[styles.liveDot, { backgroundColor: isLiveConnected ? Colors.success : Colors.error }]} />
            <Text style={styles.liveText}>{isLiveConnected ? 'Live Connection' : 'Offline'}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => refetch()}>
          <Ionicons name="refresh" size={20} color={Colors.gold} />
        </TouchableOpacity>
      </View>

      {/* Stats Summary Panel */}
      <View style={styles.statsPanel}>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{totalOrders}</Text>
          <Text style={styles.statLabel}>Total Orders</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statVal, { color: Colors.warning }]}>{activeOrders}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statVal, { color: Colors.success }]}>₹{(totalRevenue/1000).toFixed(1)}k</Text>
          <Text style={styles.statLabel}>Revenue</Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={16} color={Colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by ID or customer..."
          placeholderTextColor={Colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter Tabs scrollbar */}
      <View style={{ height: 44, marginBottom: 12 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
          {[
            { key: 'all', label: 'All' },
            { key: 'pending', label: 'Pending' },
            { key: 'packed', label: 'Packed' },
            { key: 'shipped', label: 'Shipped' },
            { key: 'out_for_delivery', label: 'Out for Delivery' },
            { key: 'delivered', label: 'Delivered' },
            { key: 'cancelled', label: 'Cancelled' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabBtn, filter === tab.key && styles.tabBtnActive]}
              onPress={() => setFilter(tab.key)}
            >
              <Text style={[styles.tabText, filter === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.loader}><ActivityIndicator color={Colors.gold} size="large" /></View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(o) => o.id}
          contentContainerStyle={{ padding: Spacing.base, paddingBottom: 60, gap: 12 }}
          renderItem={({ item }) => {
            const isExpanded = expandedOrderId === item.id;
            const cancellationFee = parseFloat(item.cancellation_fee || 0);

            return (
              <View style={[styles.orderCard, isExpanded && styles.orderCardExpanded]}>
                {/* Collapsed view header */}
                <TouchableOpacity style={styles.cardHeader} onPress={() => toggleExpand(item.id)}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.orderIdRow}>
                      <Text style={styles.orderId}>#{item.id.slice(-8).toUpperCase()}</Text>
                      <View style={[styles.statusPill, { borderColor: (STATUS_COLORS[item.status] || Colors.gold) + '40', backgroundColor: (STATUS_COLORS[item.status] || Colors.gold) + '15' }]}>
                        <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] || Colors.gold }]}>
                          {item.status.replace(/_/g, ' ').toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.customerName}>{item.user_name || 'Guest Customer'}</Text>
                  </View>
                  <View style={styles.totalWrap}>
                    <Text style={styles.cardTotal}>₹{parseFloat(item.total).toFixed(0)}</Text>
                    <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textMuted} />
                  </View>
                </TouchableOpacity>

                {/* Expanded view detail panel */}
                {isExpanded && (
                  <View style={styles.cardDetails}>
                    <View style={styles.divider} />
                    
                    {/* Address & Customer details */}
                    <Text style={styles.detailSectionTitle}>Shipping Details</Text>
                    <Text style={styles.detailText}>Email: {item.user_email || 'N/A'}</Text>
                    <Text style={styles.detailText}>
                      Address: {item.line1 ? `${item.line1}, ${item.city}, ${item.state} - ${item.pincode}` : 'No address saved'}
                    </Text>

                    {/* Order items details */}
                    <Text style={[styles.detailSectionTitle, { marginTop: 12 }]}>Items</Text>
                    {item.items?.map((prod: any) => (
                      <View key={prod.id} style={styles.itemRow}>
                        <Text style={styles.itemRowText}>
                          • {prod.quantity}x {prod.product_name} {prod.size ? `(Size: ${prod.size})` : ''}
                        </Text>
                        <Text style={styles.itemRowPrice}>₹{parseFloat(prod.total_price).toFixed(0)}</Text>
                      </View>
                    ))}

                    {/* Price Breakdown details */}
                    <View style={styles.breakdownBox}>
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Subtotal</Text>
                        <Text style={styles.breakdownVal}>₹{parseFloat(item.subtotal).toFixed(2)}</Text>
                      </View>
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Shipping</Text>
                        <Text style={styles.breakdownVal}>₹{parseFloat(item.shipping).toFixed(2)}</Text>
                      </View>
                      {parseFloat(item.discount) > 0 && (
                        <View style={styles.breakdownRow}>
                          <Text style={styles.breakdownLabel}>Discount</Text>
                          <Text style={styles.breakdownVal}>-₹{parseFloat(item.discount).toFixed(2)}</Text>
                        </View>
                      )}
                      {cancellationFee > 0 && (
                        <View style={styles.breakdownRow}>
                          <Text style={[styles.breakdownLabel, { color: Colors.error }]}>Cancel Fee</Text>
                          <Text style={[styles.breakdownVal, { color: Colors.error }]}>₹{cancellationFee.toFixed(2)}</Text>
                        </View>
                      )}
                      <View style={[styles.breakdownRow, { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 6, marginTop: 4 }]}>
                        <Text style={styles.breakdownTotalLabel}>Grand Total</Text>
                        <Text style={styles.breakdownTotalVal}>₹{parseFloat(item.total).toFixed(2)}</Text>
                      </View>
                    </View>

                    {/* Admin Actions Panel */}
                    {item.status !== 'cancelled' && item.status !== 'delivered' && (
                      <View style={styles.actionsPanel}>
                        <TouchableOpacity 
                          style={styles.actionBtnFF} 
                          onPress={() => handleFastForward(item.id)}
                          disabled={actionLoadingId != null}
                        >
                          <Ionicons name="play-forward-outline" size={14} color={Colors.black} />
                          <Text style={styles.actionBtnFFText}>Fast-Forward 1h</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                          style={styles.actionBtnCancel} 
                          onPress={() => handleCancelOrder(item.id)}
                          disabled={actionLoadingId != null}
                        >
                          <Ionicons name="ban-outline" size={14} color={Colors.error} />
                          <Text style={styles.actionBtnCancelText}>Cancel Order</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    
                    {actionLoadingId === item.id && (
                      <ActivityIndicator style={{ marginTop: 10 }} color={Colors.gold} size="small" />
                    )}

                  </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="albums-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No matching orders</Text>
              <Text style={styles.emptyText}>There are no orders that match this search filter query.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgPrimary },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: Spacing.base, paddingVertical: Spacing.base, borderBottomWidth: 1, borderBottomColor: Colors.border },
  titleWrap: { flex: 1, alignItems: 'center' },
  title: { fontFamily: Typography.fontHeading, fontSize: Typography.lg, color: Colors.textPrimary },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveText: { fontFamily: Typography.fontBody, fontSize: 10, color: Colors.textMuted },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  statsPanel: { flexDirection: 'row', paddingHorizontal: Spacing.base, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  statBox: { flex: 1, alignItems: 'center' },
  statVal: { fontFamily: Typography.fontHeadingBold, fontSize: Typography.lg, color: Colors.textPrimary },
  statLabel: { fontFamily: Typography.fontBody, fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  
  searchContainer: { flexDirection: 'row', alignItems: 'center', margin: Spacing.base, backgroundColor: Colors.surface1, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 12 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 40, fontFamily: Typography.fontBody, fontSize: Typography.sm, color: Colors.textPrimary },
  
  tabsContainer: { paddingHorizontal: Spacing.base, gap: 8 },
  tabBtn: { paddingHorizontal: 16, height: 32, borderRadius: BorderRadius.full, backgroundColor: Colors.surface1, justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  tabBtnActive: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  tabText: { fontFamily: Typography.fontBodyMedium, fontSize: Typography.xs, color: Colors.textSecondary },
  tabTextActive: { color: Colors.black, fontFamily: Typography.fontBodyBold },
  
  orderCard: { backgroundColor: Colors.surface1, borderRadius: BorderRadius.lg, marginHorizontal: Spacing.base, padding: Spacing.base, borderWidth: 1, borderColor: Colors.border },
  orderCardExpanded: { borderColor: Colors.gold + '60' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderIdRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orderId: { fontFamily: Typography.fontBodyBold, fontSize: Typography.base, color: Colors.textPrimary },
  statusPill: { borderRadius: BorderRadius.full, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1 },
  statusText: { fontFamily: Typography.fontBodyBold, fontSize: 8, letterSpacing: 0.5 },
  customerName: { fontFamily: Typography.fontBody, fontSize: Typography.xs, color: Colors.textMuted, marginTop: 4 },
  totalWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTotal: { fontFamily: Typography.fontHeadingBold, fontSize: Typography.md, color: Colors.gold },
  
  cardDetails: { marginTop: 12 },
  divider: { height: 1, backgroundColor: Colors.border, marginBottom: 12 },
  detailSectionTitle: { fontFamily: Typography.fontBodyBold, fontSize: Typography.xs, color: Colors.gold, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailText: { fontFamily: Typography.fontBody, fontSize: Typography.xs, color: Colors.textSecondary, marginBottom: 4 },
  
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  itemRowText: { fontFamily: Typography.fontBody, fontSize: Typography.xs, color: Colors.textSecondary },
  itemRowPrice: { fontFamily: Typography.fontBodyMedium, fontSize: Typography.xs, color: Colors.textPrimary },
  
  breakdownBox: { backgroundColor: Colors.surface2, borderRadius: BorderRadius.md, padding: 8, marginTop: 10, gap: 4 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between' },
  breakdownLabel: { fontFamily: Typography.fontBody, fontSize: Typography.xs, color: Colors.textMuted },
  breakdownVal: { fontFamily: Typography.fontBody, fontSize: Typography.xs, color: Colors.textSecondary },
  breakdownTotalLabel: { fontFamily: Typography.fontBodyBold, fontSize: Typography.xs, color: Colors.textPrimary },
  breakdownTotalVal: { fontFamily: Typography.fontHeadingBold, fontSize: Typography.sm, color: Colors.gold },
  
  actionsPanel: { flexDirection: 'row', gap: 12, marginTop: 14, justifyContent: 'flex-end' },
  actionBtnFF: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.gold, borderRadius: BorderRadius.md, paddingHorizontal: 12, paddingVertical: 8 },
  actionBtnFFText: { fontFamily: Typography.fontBodyBold, fontSize: 10, color: Colors.black },
  actionBtnCancel: { flexDirection: 'row', alignItems: 'center', gap: 4, borderColor: Colors.error + '60', borderWidth: 1, borderRadius: BorderRadius.md, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: Colors.error + '10' },
  actionBtnCancelText: { fontFamily: Typography.fontBodyBold, fontSize: 10, color: Colors.error },
  
  empty: { flex: 1, alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontFamily: Typography.fontHeading, fontSize: Typography.base, color: Colors.textPrimary },
  emptyText: { fontFamily: Typography.fontBody, fontSize: Typography.xs, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: 40 },
});

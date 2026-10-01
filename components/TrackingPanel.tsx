'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Order } from '@/types';
import Map from './Map';
import { getDistanceKm, getEtaMinutes, formatEta } from '@/lib/distance';
import { Navigation, Clock, Truck, MapPin } from 'lucide-react';

interface TrackingPanelProps {
  order: Order;
}

export default function TrackingPanel({ order }: TrackingPanelProps) {
  const [driverPos, setDriverPos] = useState<[number, number] | null>(null);
  const [driverName, setDriverName] = useState('');
  const [eta, setEta] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);

  useEffect(() => {
    if (!order.driver_id) return;

    const loadDriver = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, latitude, longitude')
        .eq('id', order.driver_id)
        .single();
      if (data?.latitude && data?.longitude) {
        setDriverName(data.full_name);
        setDriverPos([data.latitude, data.longitude]);
      }
    };

    loadDriver();

    // Real-time: haydovchi joylashuvi o'zgarganda avtomatik yangilanadi
    const channel = supabase
      .channel(`driver_loc_${order.driver_id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${order.driver_id}`,
        },
        (payload) => {
          const { latitude, longitude, full_name } = payload.new as any;
          if (latitude && longitude) {
            setDriverName(full_name);
            setDriverPos([latitude, longitude]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order.driver_id]);

  // ETA va masofani hisoblash
  useEffect(() => {
    if (driverPos && order.latitude && order.longitude) {
      const d = getDistanceKm(driverPos[0], driverPos[1], order.latitude, order.longitude);
      setDistance(d);
      setEta(getEtaMinutes(d));
    }
  }, [driverPos, order.latitude, order.longitude]);

  if (!order.driver_id) return null;

  const markers = [];
  if (order.latitude && order.longitude) {
    markers.push({
      position: [order.latitude, order.longitude] as [number, number],
      title: 'Mijoz manzili',
      description: order.delivery_address,
    });
  }
  if (driverPos) {
    markers.push({
      position: driverPos,
      title: `Haydovchi: ${driverName || '—'}`,
      description: 'Hozirgi joylashuv',
    });
  }

  const center: [number, number] = driverPos
    ? driverPos
    : order.latitude && order.longitude
      ? [order.latitude, order.longitude]
      : [41.37, 64.58];

  return (
    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-5 mt-3">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-bold text-gray-800 flex items-center gap-2">
          <Navigation className="w-5 h-5 text-purple-600" />
          Jonli kuzatuv
        </h4>
        {eta !== null && (
          <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1 animate-pulse">
            <Clock className="w-4 h-4" />
            {formatEta(eta)}
          </span>
        )}
      </div>

      {driverPos ? (
        <>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-white rounded-xl p-3 flex items-center gap-2">
              <Truck className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-xs text-gray-500">Haydovchi</p>
                <p className="font-semibold text-sm">{driverName || '—'}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl p-3 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-xs text-gray-500">Qolgan masofa</p>
                <p className="font-semibold text-sm">
                  {distance !== null ? distance.toFixed(1) + ' km' : '—'}
                </p>
              </div>
            </div>
          </div>
          <Map center={center} zoom={13} markers={markers} height="280px" />
        </>
      ) : (
        <p className="text-sm text-gray-500">Haydovchi joylashuvi kutilmoqda...</p>
      )}
    </div>
  );
}
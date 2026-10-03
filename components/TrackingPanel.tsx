'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Order } from '@/types';
import Map from './Map';
import { getDistanceKm, getEtaMinutes, formatEta } from '@/lib/distance';
import { Navigation, Clock, Truck, MapPin, Phone, Car } from 'lucide-react';

interface TrackingPanelProps {
  order: Order;
}

export default function TrackingPanel({ order }: TrackingPanelProps) {
  const [driverPos, setDriverPos] = useState<[number, number] | null>(null);
  const [driverName, setDriverName] = useState('');
  const [driverTel, setDriverTel] = useState('');
  const [carInfo, setCarInfo] = useState('');
  const [eta, setEta] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);

  useEffect(() => {
    if (!order.driver_id) return;

    const loadDriver = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, phone, driver_phone, car_plate, car_model, latitude, longitude')
        .eq('id', order.driver_id)
        .single();
      if (data) {
        setDriverName(data.full_name);
        setDriverTel(data.driver_phone || data.phone || '');
        const parts = [];
        if (data.car_plate) parts.push(data.car_plate);
        if (data.car_model) parts.push(data.car_model);
        setCarInfo(parts.join(' · '));
        if (data.latitude && data.longitude) {
          setDriverPos([data.latitude, data.longitude]);
        }
      }
    };

    loadDriver();

    const channel = supabase
      .channel(`driver_loc_${order.driver_id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${order.driver_id}` },
        (payload) => {
          const { latitude, longitude, full_name, driver_phone, phone, car_plate, car_model } = payload.new as any;
          if (latitude && longitude) {
            setDriverName(full_name);
            setDriverPos([latitude, longitude]);
            setDriverTel(driver_phone || phone || '');
            const parts = [];
            if (car_plate) parts.push(car_plate);
            if (car_model) parts.push(car_model);
            setCarInfo(parts.join(' · '));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [order.driver_id]);

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
      title: `Haydovchi: ${driverName}`,
      description: carInfo || 'Hozirgi joylashuv',
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
          <Navigation className="w-5 h-5 text-purple-600" /> Jonli kuzatuv
        </h4>
        {eta !== null && (
          <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1 animate-pulse">
            <Clock className="w-4 h-4" /> {formatEta(eta)}
          </span>
        )}
      </div>

      {driverPos ? (
        <>
          {/* Haydovchi kartasi */}
          <div className="bg-white rounded-xl p-4 mb-3 flex items-center gap-3">
            <div className="bg-purple-100 p-3 rounded-xl">
              <Truck className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-800">{driverName}</p>
              {carInfo && (
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <Car className="w-3 h-3" /> {carInfo}
                </p>
              )}
              {driverTel && (
                <a href={`tel:${driverTel}`} className="text-sm text-blue-600 underline flex items-center gap-1 mt-1">
                  <Phone className="w-3 h-3" /> {driverTel}
                </a>
              )}
            </div>
            {distance !== null && (
              <div className="text-right">
                <p className="text-xs text-gray-500">Masofa</p>
                <p className="font-bold text-purple-600">{distance.toFixed(1)} km</p>
              </div>
            )}
          </div>
          <Map center={center} zoom={13} markers={markers} height="280px" />
        </>
      ) : (
        <p className="text-sm text-gray-500">Haydovchi joylashuvi kutilmoqda...</p>
      )}
    </div>
  );
}
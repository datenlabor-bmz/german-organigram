'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import EntityModal from './EntityModal';
import { getEntityById } from '@/lib/entities';
import { Entity } from '@/types/entity';

export default function ModalHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const entityId = searchParams.get('entity');
  const [entity, setEntity] = useState<Entity | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!entityId) {
      setEntity(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const foundEntity = getEntityById(entityId);
    setEntity(foundEntity);
    setLoading(false);
  }, [entityId]);

  const handleClose = () => {
    router.replace('/', { scroll: false });
  };

  const handleEntitySelect = (newEntityId: string) => {
    router.replace(`/?entity=${newEntityId}`, { scroll: false });
  };

  if (!entityId) return null;

  return (
    <EntityModal 
      entity={entity} 
      onClose={handleClose}
      onEntitySelect={handleEntitySelect}
      loading={loading} 
    />
  );
}

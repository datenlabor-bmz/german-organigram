'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import EntityModal from './EntityModal';
import { getFullEntityByName } from '@/lib/entities';
import { Entity } from '@/types/entity';

export default function ModalHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const entityParam = searchParams.get('entity');
  const [entity, setEntity] = useState<Entity | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!entityParam) {
      setEntity(null);
      setLoading(false);
      return;
    }

    const orgName = decodeURIComponent(entityParam);
    setLoading(true);
    getFullEntityByName(orgName).then(foundEntity => {
      setEntity(foundEntity);
      setLoading(false);
    });
  }, [entityParam]);

  const handleClose = () => {
    router.replace('/', { scroll: false });
  };

  const handleEntitySelect = (orgName: string) => {
    router.replace(`/?entity=${encodeURIComponent(orgName)}`, { scroll: false });
  };

  if (!entityParam) return null;

  return (
    <EntityModal 
      entity={entity} 
      onClose={handleClose}
      onEntitySelect={handleEntitySelect}
      loading={loading} 
    />
  );
}

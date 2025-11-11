'use client';

import { Entity } from '@/types/entity';
import { Globe, Mail, MapPin, Phone, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface EntityModalProps {
    entity: Entity | null;
    onClose: () => void;
    loading: boolean;
}

export default function EntityModal({ entity, onClose, loading }: EntityModalProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), 10);
        return () => clearTimeout(timer);
    }, []);

    const handleClose = useCallback(() => {
        setIsClosing(true);
        setTimeout(() => onClose(), 300);
    }, [onClose]);

    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleClose();
        };
        document.addEventListener('keydown', handleKeyPress);
        return () => document.removeEventListener('keydown', handleKeyPress);
    }, [handleClose]);

    useEffect(() => {
        document.documentElement.style.overflow = 'hidden';
        return () => {
            document.documentElement.style.overflow = '';
        };
    }, []);

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) handleClose();
    };

    const CloseButton = () => (
        <button
            onClick={handleClose}
            className="flex items-center justify-center h-8 w-8 rounded-md transition-colors text-gray-600 bg-gray-200 hover:bg-gray-300 hover:text-gray-800 border border-gray-300 hover:border-gray-400 flex-shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-300"
            aria-label="Close modal"
        >
            <X className="h-4 w-4" />
        </button>
    );

    const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
        <div>
            <span className="font-normal text-gray-600 text-sm uppercase tracking-wide block mb-2">{label}</span>
            <div className="mt-1">{children}</div>
        </div>
    );

    const LinkItem = ({ href, icon: Icon, label }: { href: string; icon: React.ComponentType<{ size: number; className: string }>; label: string }) => (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 text-un-blue hover:opacity-80 transition-opacity duration-200 py-2 px-3 rounded-lg hover:bg-blue-50 touch-manipulation"
        >
            <Icon size={18} className="flex-shrink-0" />
            <span className="text-base sm:text-lg">{label}</span>
        </a>
    );

    const renderHeader = () => {
        if (loading) {
            return (
                <div className="flex items-center justify-between">
                    <div className="h-6 bg-gray-200 rounded w-48 animate-pulse flex-1 mr-4"></div>
                    <CloseButton />
                </div>
            );
        }

        if (!entity) {
            return (
                <div className="flex items-center justify-between">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex-1 pr-4">Behörde nicht gefunden</h2>
                    <CloseButton />
                </div>
            );
        }

        return (
            <div className="flex items-start justify-between gap-4">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight flex-1">
                    {entity.Organisation}
                </h2>
                <CloseButton />
            </div>
        );
    };

    const renderBody = () => {
        if (loading) {
            return (
                <div className="p-4 sm:p-6 space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                </div>
            );
        }

        if (!entity) {
            return (
                <div className="p-4 sm:p-6">
                    <p className="text-gray-600">Die angeforderte Behörde konnte nicht gefunden werden.</p>
                </div>
            );
        }

        return (
            <div className="px-6 sm:px-8 pt-4 sm:pt-5 pb-6 sm:pb-8 space-y-6">
                {(entity.OrganisationKurz || entity.OrganisationKurzInoffiziell) && (
                    <div className="text-lg font-semibold text-gray-700">
                        {entity.OrganisationKurz || entity.OrganisationKurzInoffiziell}
                    </div>
                )}

                <div className="space-y-6">
                    {entity.Ressort && (
                        <Field label="Ressort">
                            <span className="inline-block px-3 py-1.5 bg-blue-100 text-blue-900 rounded-full text-sm font-medium">
                                {entity.Ressort}
                            </span>
                        </Field>
                    )}

                    {entity.Internetadresse && (
                        <Field label="Website">
                            <LinkItem href={entity.Internetadresse} icon={Globe} label="Offizielle Website" />
                        </Field>
                    )}

                    {entity.locations && entity.locations.length > 0 && (
                        <Field label={`${entity.locations.length === 1 ? 'Standort' : `Standorte (${entity.locations.length})`}`}>
                            <div className="space-y-3">
                                {entity.locations.map((location, index) => {
                                    const hasAddress = location.Hauptadresse || location.PLZ || location.Ort;
                                    const hasContact = location.Telefon || location['E-Mail'];
                                    
                                    if (!hasAddress && !hasContact) return null;

                                    return (
                                        <div key={index} className="p-4 bg-gray-50 rounded-lg space-y-3 border border-gray-100">
                                            {hasAddress && (
                                                <div className="flex items-start gap-3">
                                                    <MapPin className="h-5 w-5 mt-0.5 text-gray-500 flex-shrink-0" />
                                                    <div className="text-gray-700">
                                                        {location.Hauptadresse && <div className="font-medium">{location.Hauptadresse}</div>}
                                                        {(location.PLZ || location.Ort) && (
                                                            <div className="mt-0.5">{location.PLZ} {location.Ort}</div>
                                                        )}
                                                        {location.Bundesland && <div className="text-gray-600 text-sm mt-1">{location.Bundesland}</div>}
                                                    </div>
                                                </div>
                                            )}

                                            {location.Telefon && (
                                                <div className="flex items-center gap-3">
                                                    <Phone className="h-5 w-5 text-gray-500 flex-shrink-0" />
                                                    <a href={`tel:${location.Telefon}`} className="text-un-blue hover:opacity-80 transition-opacity duration-200">
                                                        {location.Telefon}
                                                    </a>
                                                </div>
                                            )}

                                            {location['E-Mail'] && (
                                                <div className="flex items-center gap-3">
                                                    <Mail className="h-5 w-5 text-gray-500 flex-shrink-0" />
                                                    <a href={`mailto:${location['E-Mail']}`} className="text-un-blue hover:opacity-80 transition-opacity duration-200 break-all">
                                                        {location['E-Mail']}
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </Field>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div
            className={`fixed inset-0 bg-black/50 flex items-center justify-end z-50 transition-all duration-300 ease-out ${isVisible && !isClosing ? 'opacity-100' : 'opacity-0'}`}
            onClick={handleBackdropClick}
        >
            <div
                className={`w-full sm:w-2/3 md:w-1/2 lg:w-1/3 sm:min-w-[400px] lg:min-w-[500px] h-full bg-white shadow-2xl transition-transform duration-300 ease-out ${entity ? 'overflow-y-auto' : ''} ${isVisible && !isClosing ? 'translate-x-0' : 'translate-x-full'}`}
            >
                <div className={`px-6 sm:px-8 pt-4 sm:pt-6 pb-2 sm:pb-3 border-b border-gray-300 ${entity ? 'sticky top-0 bg-white' : ''}`}>
                    {renderHeader()}
                </div>
                {renderBody()}
            </div>
        </div>
    );
}

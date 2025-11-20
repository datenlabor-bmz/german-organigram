'use client';

import { Entity } from '@/types/entity';
import { getEntityBudgetAmount, getEntityBudgetBreakdown, searchEntities } from '@/lib/entities';
import { Globe, Mail, MapPin, Phone, X, Facebook, Twitter, Instagram, BookOpen, Youtube, Linkedin, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import DataSourceBadge from './DataSourceBadge';
import { getWikidataForEntity, getWikidataDescription, getWikidataInception, getWikidataWikipediaLink, getWikidataSocialMedia, getWikidataUrl, getWikidataLogo, getWikidataImage, getWikidataEmployeeCount, getWikidataCurrentLeader, getWikidataInstanceOf, getWikidataSubsidiaries, getWikidataEmail, getWikidataBudget, getWikidataReplaces, getWikidataReplacedBy } from '@/lib/wikidata';

interface EntityModalProps {
    entity: Entity | null;
    onClose: () => void;
    onEntitySelect: (entityId: string) => void;
    loading: boolean;
}

export default function EntityModal({ entity, onClose, onEntitySelect, loading }: EntityModalProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [budgetAmount, setBudgetAmount] = useState<number | null>(null);
    const [budgetLoading, setBudgetLoading] = useState(false);
    const [budgetBreakdown, setBudgetBreakdown] = useState<Array<{label: string; description: string; amount: number}> | null>(null);
    const [breakdownLoading, setBreakdownLoading] = useState(false);
    
    const wikidataEntity = entity ? getWikidataForEntity(entity.OrganisationId) : null;
    const wikidataEmail = wikidataEntity ? getWikidataEmail(wikidataEntity) : null;

    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), 10);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (entity?.budgetMatch) {
            setBudgetLoading(true);
            setBreakdownLoading(true);
            
            getEntityBudgetAmount(entity).then(amount => {
                setBudgetAmount(amount);
                setBudgetLoading(false);
            });
            
            getEntityBudgetBreakdown(entity).then(breakdown => {
                setBudgetBreakdown(breakdown);
                setBreakdownLoading(false);
            });
        } else {
            setBudgetAmount(null);
            setBudgetLoading(false);
            setBudgetBreakdown(null);
            setBreakdownLoading(false);
        }
    }, [entity]);

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

    const Section = ({ title, source, sourceHref, children }: { title: string; source?: 'wikidata' | 'bva' | 'bundeshaushalt' | 'eigen'; sourceHref?: string; children: React.ReactNode }) => (
        <div className="bg-gray-50 rounded-lg p-4 space-y-4 border border-gray-100">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wider">{title}</h3>
                {source && <DataSourceBadge source={source} href={sourceHref} />}
            </div>
            <div className="space-y-4">
                {children}
            </div>
        </div>
    );

    const Field = ({ label, children }: { label: string | React.ReactNode; children: React.ReactNode }) => (
        <div>
            <div className="font-normal text-gray-600 text-sm uppercase tracking-wide block mb-2">{label}</div>
            <div className="mt-1">{children}</div>
        </div>
    );

    const LinkItem = ({ href, icon: Icon, label, followers }: { href: string; icon: React.ComponentType<{ className: string }>; label: string; followers?: number }) => (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 text-blue-600 hover:opacity-80 transition-opacity duration-200 py-1"
        >
            <Icon className="h-5 w-5 flex-shrink-0" />
            <span className="text-base">{label}</span>
            {followers !== undefined && (
                <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Users className="h-3 w-3" />
                    {followers.toLocaleString('de-DE')}
                </span>
            )}
        </a>
    );

    const getPartyBadge = (partyName: string): { abbrev: string; bgColor: string; textColor: string } => {
        const normalizedName = partyName.toLowerCase();
        
        // CDU - Christlich Demokratische Union Deutschlands
        if (normalizedName.includes('christlich') && normalizedName.includes('demokrat') && normalizedName.includes('union')) {
            return { abbrev: 'CDU', bgColor: 'bg-black', textColor: 'text-white' };
        }
        
        // CSU - Christlich-Soziale Union
        if (normalizedName.includes('christlich') && normalizedName.includes('sozial')) {
            return { abbrev: 'CSU', bgColor: 'bg-blue-900', textColor: 'text-white' };
        }
        
        // SPD - Sozialdemokratische Partei Deutschlands
        if (normalizedName.includes('sozialdemokrat')) {
            return { abbrev: 'SPD', bgColor: 'bg-red-600', textColor: 'text-white' };
        }
        
        // Bündnis 90/Die Grünen
        if (normalizedName.includes('grüne') || normalizedName.includes('grune') || (normalizedName.includes('bündnis') && normalizedName.includes('90'))) {
            return { abbrev: 'Grüne', bgColor: 'bg-green-600', textColor: 'text-white' };
        }
        
        // FDP - Freie Demokratische Partei
        if ((normalizedName.includes('freie') && normalizedName.includes('demokrat')) || normalizedName === 'fdp') {
            return { abbrev: 'FDP', bgColor: 'bg-yellow-400', textColor: 'text-gray-900' };
        }
        
        // Die Linke
        if (normalizedName.includes('die linke') || normalizedName === 'linke') {
            return { abbrev: 'Linke', bgColor: 'bg-purple-700', textColor: 'text-white' };
        }
        
        // AfD - Alternative für Deutschland
        if (normalizedName.includes('alternative') && normalizedName.includes('deutschland')) {
            return { abbrev: 'AfD', bgColor: 'bg-blue-500', textColor: 'text-white' };
        }
        
        // Exact abbreviation matches
        const exactMatches: Record<string, { abbrev: string; bgColor: string; textColor: string }> = {
            'cdu': { abbrev: 'CDU', bgColor: 'bg-black', textColor: 'text-white' },
            'csu': { abbrev: 'CSU', bgColor: 'bg-blue-900', textColor: 'text-white' },
            'spd': { abbrev: 'SPD', bgColor: 'bg-red-600', textColor: 'text-white' },
            'fdp': { abbrev: 'FDP', bgColor: 'bg-yellow-400', textColor: 'text-gray-900' },
            'afd': { abbrev: 'AfD', bgColor: 'bg-blue-500', textColor: 'text-white' },
        };
        
        if (exactMatches[normalizedName]) {
            return exactMatches[normalizedName];
        }
        
        // Default for unknown parties - use full name
        return { abbrev: partyName, bgColor: 'bg-gray-500', textColor: 'text-white' };
    };

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
                    {entity.OrganisationKurz || entity.OrganisationKurzInoffiziell
                        ? `${entity.OrganisationKurz || entity.OrganisationKurzInoffiziell}: ${entity.Organisation}`
                        : entity.Organisation}
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
                {(entity.Ressort || entity.Kategorie) && (
                    <Section title="Einordnung" source="eigen">
                        {entity.Ressort && (
                            <Field label="Ressort">
                                <button
                                    onClick={() => {
                                        const ressortEntities = searchEntities(entity.Ressort || '');
                                        const ressortEntity = ressortEntities.find(e => 
                                            e.OrganisationKurz === entity.Ressort && e.IstRessort
                                        );
                                        if (ressortEntity) {
                                            onEntitySelect(String(ressortEntity.OrganisationId));
                                        }
                                    }}
                                    className="inline-block px-3 py-1.5 bg-blue-100 text-blue-900 rounded-full text-sm font-medium hover:bg-blue-200 transition-colors cursor-pointer"
                                >
                                    {entity.Ressort}
                                </button>
                            </Field>
                        )}

                        {entity.Kategorie && (
                            <Field label="Kategorie">
                                <span className={`inline-block px-3 py-1.5 rounded-full text-sm font-medium text-gray-900 ${
                                    entity.Kategorie === 'Oberste Bundesbehörde' ? 'bg-red-300' :
                                    entity.Kategorie === 'Bundesoberbehörde' ? 'bg-amber-200' :
                                    entity.Kategorie === 'Bundesmittelbehörde' ? 'bg-blue-200' :
                                    entity.Kategorie === 'Bundesunterbehörde' ? 'bg-slate-200' :
                                    entity.Kategorie === 'Bundesagentur' ? 'bg-sky-200' :
                                    entity.Kategorie === 'Beauftragter' ? 'bg-violet-200' :
                                    entity.Kategorie === 'Unternehmen' ? 'bg-emerald-200' :
                                    entity.Kategorie === 'Stiftung des Privatrechts' ? 'bg-cyan-200' :
                                    entity.Kategorie === 'Unklar' ? 'bg-gray-200' :
                                    'bg-stone-200'
                                }`}>
                                    {entity.Kategorie}
                                </span>
                            </Field>
                        )}
                    </Section>
                )}

                {wikidataEntity && (() => {
                    const description = getWikidataDescription(wikidataEntity, 'de');
                    const inception = getWikidataInception(wikidataEntity);
                    const wikiDe = getWikidataWikipediaLink(wikidataEntity, 'de');
                    const social = getWikidataSocialMedia(wikidataEntity);
                    const wikidataUrl = getWikidataUrl(wikidataEntity.qid);
                    const logo = getWikidataLogo(wikidataEntity);
                    const employeeCount = getWikidataEmployeeCount(wikidataEntity);
                    const currentLeader = getWikidataCurrentLeader(wikidataEntity);
                    const instanceOf = getWikidataInstanceOf(wikidataEntity);
                    const subsidiaries = getWikidataSubsidiaries(wikidataEntity);
                    const budget = getWikidataBudget(wikidataEntity);
                    const replaces = getWikidataReplaces(wikidataEntity);
                    const replacedBy = getWikidataReplacedBy(wikidataEntity);

                    if (!logo && !inception && !employeeCount && !currentLeader && !instanceOf && !budget && subsidiaries.length === 0 && !wikiDe && !social.twitter && !social.bluesky && !social.facebook && !social.instagram && !social.youtube && !social.linkedin) {
                        return null;
                    }

                    return (
                        <Section title="Metadaten" source="wikidata" sourceHref={wikidataUrl}>
                            {logo && (
                                <img 
                                    src={logo} 
                                    alt={`${entity.Organisation} Logo`}
                                    className="h-32 w-auto object-contain"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                            )}

                            {currentLeader && (
                                <Field label="Leitung">
                                    <div className="flex items-start gap-4">
                                        {currentLeader.image && (
                                            <img 
                                                src={currentLeader.image}
                                                alt={currentLeader.name}
                                                className="w-32 h-32 rounded object-cover flex-shrink-0"
                                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                            />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <a 
                                                    href={`https://www.wikidata.org/wiki/${currentLeader.qid}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="font-semibold text-gray-900 hover:opacity-70 transition-opacity"
                                                >
                                                    {currentLeader.name}
                                                </a>
                                                {currentLeader.party && (() => {
                                                    const badge = getPartyBadge(currentLeader.party);
                                                    return (
                                                        <span className={`inline-block px-3 py-1 rounded-full text-sm ${badge.bgColor} ${badge.textColor}`}>
                                                            {badge.abbrev}
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                            <div className="mt-2 space-y-1 text-sm">
                                                {currentLeader.since && (
                                                    <div className="text-gray-600">Im Amt seit {currentLeader.since}</div>
                                                )}
                                                {currentLeader.age !== undefined && (
                                                    <div className="flex items-center gap-2 text-gray-600">
                                                        <span>{currentLeader.age} Jahre</span>
                                                        {currentLeader.gender && (
                                                            <span className="text-gray-500">
                                                                {currentLeader.gender === 'm' ? '♂' : currentLeader.gender === 'w' ? '♀' : '⚥'}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Field>
                            )}

                            {instanceOf && (
                                <Field label="Typ">
                                    <span className="text-gray-700">{instanceOf}</span>
                                </Field>
                            )}

                            {inception && (
                                <Field label="Gegründet">
                                    <span className="text-gray-700">{inception}</span>
                                </Field>
                            )}

                            {employeeCount && (
                                <Field label="Mitarbeiter">
                                    <span className="text-gray-700">{employeeCount.count.toLocaleString('de-DE')}</span>
                                    {employeeCount.date && <span className="text-gray-600"> ({employeeCount.date})</span>}
                                </Field>
                            )}

                            {budget && (
                                <Field label="Haushalt">
                                    <span className="text-gray-700">{budget.currency}{(budget.amount / 1_000_000_000).toFixed(2)} Mrd.</span>
                                    {budget.year && <span className="text-gray-600"> ({budget.year})</span>}
                                </Field>
                            )}

                            {subsidiaries.length > 0 && (
                                <Field label="Nachgeordnete Behörden">
                                    <div className="space-y-1 text-sm">
                                        {subsidiaries.map((sub, idx) => (
                                            <div key={idx} className="text-gray-700">• {sub.name}</div>
                                        ))}
                                    </div>
                                </Field>
                            )}

                            {(wikiDe || social.twitter || social.bluesky || social.facebook || social.instagram || social.youtube || social.linkedin) && (
                                <div className="space-y-1">
                                    {wikiDe && (
                                        <LinkItem href={wikiDe} icon={BookOpen} label="Wikipedia" />
                                    )}
                                    {social.youtube && (
                                        <LinkItem href={social.youtube.url} icon={Youtube} label="YouTube" followers={social.youtube.followers} />
                                    )}
                                    {social.linkedin && (
                                        <LinkItem href={social.linkedin.url} icon={Linkedin} label="LinkedIn" followers={social.linkedin.followers} />
                                    )}
                                    {social.twitter && (
                                        <LinkItem href={social.twitter.url} icon={Twitter} label="Twitter" followers={social.twitter.followers} />
                                    )}
                                    {social.bluesky && (
                                        <LinkItem href={social.bluesky.url} icon={Globe} label="Bluesky" followers={social.bluesky.followers} />
                                    )}
                                    {social.facebook && (
                                        <LinkItem href={social.facebook.url} icon={Facebook} label="Facebook" followers={social.facebook.followers} />
                                    )}
                                    {social.instagram && (
                                        <LinkItem href={social.instagram.url} icon={Instagram} label="Instagram" followers={social.instagram.followers} />
                                    )}
                                </div>
                            )}
                        </Section>
                    );
                })()}

                    {entity.budgetMatch && (
                        <Section title="Budget" source="bundeshaushalt">
                            {budgetLoading || breakdownLoading ? (
                                <div className="space-y-2">
                                    <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
                                    <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
                                    <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                                </div>
                            ) : budgetAmount !== null ? (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <div className="text-2xl font-bold text-gray-900">
                                            {(budgetAmount / 1000000).toLocaleString('de-DE', { 
                                                minimumFractionDigits: 2, 
                                                maximumFractionDigits: 2 
                                            })} Mrd. €
                                        </div>
                                        <div className="text-sm text-gray-600">
                                            Einzelplan {entity.budgetMatch.einzelplan}
                                            {entity.budgetMatch.kapitel && ` / Kapitel ${entity.budgetMatch.kapitel}`}
                                            {entity.budgetMatch.titel && ` / Titel ${entity.budgetMatch.titel}`}
                                        </div>
                                    </div>
                                    
                                    {budgetBreakdown && budgetBreakdown.length > 0 && (
                                        <div className="space-y-3">
                                            {budgetBreakdown.map((item, index) => {
                                                const maxAmount = budgetBreakdown[0]?.amount || 1;
                                                const percentage = (item.amount / maxAmount) * 100;
                                                const amountMrd = item.amount / 1000000;
                                                
                                                return (
                                                    <div key={index} className="space-y-1">
                                                        <div className="flex justify-between items-start gap-2 text-xs">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="font-medium text-gray-900">{item.label}</div>
                                                                {item.description && (
                                                                    <div className="text-gray-600 truncate">{item.description}</div>
                                                                )}
                                                            </div>
                                                            <span className="text-gray-900 font-medium whitespace-nowrap">
                                                                {amountMrd.toLocaleString('de-DE', { maximumFractionDigits: 2 })} Mrd. €
                                                            </span>
                                                        </div>
                                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                                            <div
                                                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                                                style={{ width: `${percentage}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-sm text-gray-500">Keine Budgetdaten verfügbar</div>
                            )}
                        </Section>
                    )}

                    {(entity.Internetadresse || wikidataEmail || (entity.locations && entity.locations.length > 0)) && (
                        <Section title="Adressen" source="bva">
                            {entity.Internetadresse && (
                                <div className="flex items-center gap-3">
                                    <Globe className="h-5 w-5 text-gray-500 flex-shrink-0" />
                                    <a href={entity.Internetadresse} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:opacity-80 transition-opacity duration-200">
                                        Website
                                    </a>
                                </div>
                            )}

                            {wikidataEmail && (
                                <div className="flex items-center gap-3">
                                    <Mail className="h-5 w-5 text-gray-500 flex-shrink-0" />
                                    <a href={`mailto:${wikidataEmail}`} className="text-blue-600 hover:opacity-80 transition-opacity duration-200">
                                        {wikidataEmail}
                                    </a>
                                </div>
                            )}

                            {entity.locations && entity.locations.length > 0 && (
                            <div className="space-y-3">
                                {wikidataEntity && (() => {
                                    const image = getWikidataImage(wikidataEntity);
                                    const wikidataUrl = getWikidataUrl(wikidataEntity.qid);
                                    if (image) {
                                        return (
                                            <div className="relative inline-block">
                                                <img 
                                                    src={image} 
                                                    alt={entity.Organisation}
                                                    className="w-full max-w-[120px] rounded-lg"
                                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                />
                                                <div className="absolute bottom-2 right-2">
                                                    <DataSourceBadge source="wikidata" href={wikidataUrl} />
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
                                {entity.locations.map((location, index) => {
                                    const hasAddress = location.Hauptadresse || location.PLZ || location.Ort;
                                    const hasContact = location.Telefon || location['E-Mail'];
                                    
                                    if (!hasAddress && !hasContact) return null;

                                    const isSingleLocation = entity.locations.length === 1;
                                    const containerClass = isSingleLocation 
                                        ? "space-y-3" 
                                        : "p-4 bg-white rounded-lg space-y-3 border border-gray-200";

                                    return (
                                        <div key={index} className={containerClass}>
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
                                                    <a href={`tel:${location.Telefon}`} className="text-blue-600 hover:opacity-80 transition-opacity duration-200">
                                                        {location.Telefon}
                                                    </a>
                                                </div>
                                            )}

                                            {location['E-Mail'] && (
                                                <div className="flex items-center gap-3">
                                                    <Mail className="h-5 w-5 text-gray-500 flex-shrink-0" />
                                                    <a href={`mailto:${location['E-Mail']}`} className="text-blue-600 hover:opacity-80 transition-opacity duration-200 break-all">
                                                        {location['E-Mail']}
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            )}
                        </Section>
                    )}
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

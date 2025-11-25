import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import type { Data } from '../../types';
import rawData from '../../data.json';
import styles from './ConversionChart.module.css';

const data = rawData as Data;

const ConversionChart: React.FC = () => {
    const [visibleVariations, setVisibleVariations] = useState<Set<string>>(
        new Set(data.variations.map((v) => v.name))
    );
    const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
    const [zoomLevel, setZoomLevel] = useState<number>(100);
    const [isVariationDropdownOpen, setIsVariationDropdownOpen] = useState(false);
    const variationDropdownRef = useRef<HTMLDivElement>(null);

    const chartData = useMemo(() => {
        const dailyData = data.data.map((day) => {
            const entry: any = { date: day.date };
            data.variations.forEach((variation) => {
                const id = variation.id?.toString() || '0';
                if (day.visits[id] === undefined) {
                    entry[variation.name] = null;
                    entry[`${variation.name}_details`] = null;
                    return;
                }
                const visits = day.visits[id];
                const conversions = day.conversions[id] || 0;
                const rate = visits > 0 ? (conversions / visits) * 100 : 0;

                entry[variation.name] = parseFloat(rate.toFixed(2));
                entry[`${variation.name}_details`] = {
                    visits,
                    conversions,
                    rate: parseFloat(rate.toFixed(2))
                };
            });
            return entry;
        });

        if (viewMode === 'day') {
            return dailyData;
        } else {
            // Aggregate by week
            const weeklyData: any[] = [];
            let currentWeekStart: Date | null = null;
            let weekVisits: Record<string, number> = {};
            let weekConversions: Record<string, number> = {};

            for (const day of data.data) {
                const date = new Date(day.date);
                // Simple logic: Start new week if it's Monday or first data point
                const dayOfWeek = date.getDay(); // 0 is Sunday, 1 is Monday
                // Adjust for Monday start: 0->6, 1->0, ...
                const isMonday = dayOfWeek === 1;

                if (isMonday || currentWeekStart === null) {
                    if (currentWeekStart !== null) {
                        // Push previous week
                        const entry: any = { date: `Week of ${currentWeekStart.toISOString().split('T')[0]}` };
                        data.variations.forEach((variation) => {
                            const name = variation.name;
                            const visits = weekVisits[name] || 0;
                            const conversions = weekConversions[name] || 0;
                            const rate = visits > 0 ? (conversions / visits) * 100 : 0;

                            if (visits > 0) {
                                entry[name] = parseFloat(rate.toFixed(2));
                                entry[`${name}_details`] = {
                                    visits,
                                    conversions,
                                    rate: parseFloat(rate.toFixed(2))
                                };
                            } else {
                                entry[name] = null;
                                entry[`${name}_details`] = null;
                            }
                        });
                        weeklyData.push(entry);
                    }
                    currentWeekStart = date;
                    weekVisits = {};
                    weekConversions = {};
                }

                data.variations.forEach((variation) => {
                    const id = variation.id?.toString() || '0';
                    if (day.visits[id] !== undefined) {
                        weekVisits[variation.name] = (weekVisits[variation.name] || 0) + day.visits[id];
                        weekConversions[variation.name] = (weekConversions[variation.name] || 0) + (day.conversions[id] || 0);
                    }
                });
            }

            // Push last week
            if (currentWeekStart !== null) {
                const entry: any = { date: `Week of ${currentWeekStart.toISOString().split('T')[0]}` };
                data.variations.forEach((variation) => {
                    const name = variation.name;
                    const visits = weekVisits[name] || 0;
                    const conversions = weekConversions[name] || 0;
                    const rate = visits > 0 ? (conversions / visits) * 100 : 0;

                    if (visits > 0) {
                        entry[name] = parseFloat(rate.toFixed(2));
                        entry[`${name}_details`] = {
                            visits,
                            conversions,
                            rate: parseFloat(rate.toFixed(2))
                        };
                    } else {
                        entry[name] = null;
                        entry[`${name}_details`] = null;
                    }
                });
                weeklyData.push(entry);
            }

            return weeklyData;
        }
    }, [viewMode]);

    // Filter data to only include dates where at least one VISIBLE variation has data
    const filteredData = useMemo(() => {
        return chartData.filter(entry => {
            return Array.from(visibleVariations).some(name => entry[name] !== null && entry[name] !== undefined);
        });
    }, [chartData, visibleVariations]);

    const colors = ['#2D2D2D', '#6B7AFF', '#FF8A65', '#FFD54F'];

    const handleVariationToggle = (variationName: string) => {
        setVisibleVariations((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(variationName)) {
                if (newSet.size > 1) {
                    newSet.delete(variationName);
                }
            } else {
                newSet.add(variationName);
            }
            return newSet;
        });
    };

    // Legend click handler for Recharts
    const handleLegendClick = (e: any) => {
        handleVariationToggle(e.value);
    };

    // Zoom controls
    const handleZoomIn = () => {
        setZoomLevel(prev => Math.min(prev + 25, 200));
    };

    const handleZoomOut = () => {
        setZoomLevel(prev => Math.max(prev - 25, 50));
    };

    const handleZoomReset = () => {
        setZoomLevel(100);
    };

    // Apply zoom to data
    const zoomedData = useMemo(() => {
        if (zoomLevel === 100) return filteredData;
        const totalPoints = filteredData.length;
        const visiblePoints = Math.max(Math.floor(totalPoints * (100 / zoomLevel)), 2);
        const startIndex = Math.max(0, totalPoints - visiblePoints);
        return filteredData.slice(startIndex);
    }, [filteredData, zoomLevel]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (variationDropdownRef.current && !variationDropdownRef.current.contains(event.target as Node)) {
                setIsVariationDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Get display text for variations dropdown
    const getVariationDisplayText = () => {
        if (visibleVariations.size === data.variations.length) {
            return 'All variations selected';
        }
        const selectedNames = Array.from(visibleVariations);
        if (selectedNames.length === 1) {
            return selectedNames[0];
        }
        return `${selectedNames.length} variations selected`;
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className={styles.tooltip}>
                    <p className={styles.tooltipDate}>{label}</p>
                    {payload.map((entry: any, index: number) => {
                        const variationName = entry.name;
                        // Only show tooltip for visible variations
                        if (!visibleVariations.has(variationName)) return null;

                        const details = entry.payload[`${variationName}_details`];
                        if (!details) return null;

                        return (
                            <div key={index} className={styles.tooltipItem}>
                                <div className={styles.tooltipRow}>
                                    <span className={styles.tooltipBullet} style={{ backgroundColor: entry.color }}></span>
                                    <span className={styles.tooltipLabel}>{variationName}</span>
                                    <span className={styles.tooltipValue}>{details.rate}%</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            );
        }
        return null;
    };

    return (
        <div className={styles.container}>

            <div className={styles.controlsContainer}>
                <div className={styles.leftControls}>
                    <div className={styles.controlGroup} ref={variationDropdownRef}>
                        <div className={styles.customSelect}>
                            <button
                                className={styles.selectButton}
                                onClick={() => setIsVariationDropdownOpen(!isVariationDropdownOpen)}
                            >
                                {getVariationDisplayText()}
                                <span className={styles.selectArrow}>▼</span>
                            </button>
                            {isVariationDropdownOpen && (
                                <div className={styles.dropdownMenu}>
                                    {data.variations.map((variation, index) => (
                                        <label key={variation.name} className={styles.dropdownItem}>
                                            <input
                                                type="checkbox"
                                                checked={visibleVariations.has(variation.name)}
                                                onChange={() => handleVariationToggle(variation.name)}
                                                disabled={visibleVariations.has(variation.name) && visibleVariations.size === 1}
                                            />
                                            <span style={{ color: colors[index % colors.length] }}>{variation.name}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className={styles.controlGroup}>
                        <select
                            className={styles.select}
                            value={viewMode}
                            onChange={(e) => setViewMode(e.target.value as 'day' | 'week')}
                        >
                            <option value="day">Day</option>
                            <option value="week">Week</option>
                        </select>
                    </div>
                </div>

                <div className={styles.zoomControls}>
                    <span className={styles.label}>Line style:</span>
                    <span className={styles.lineStyleIndicator}>line</span>
                    <button className={styles.zoomButton} onClick={handleZoomOut} title="Zoom out">−</button>
                    <button className={styles.zoomButton} onClick={handleZoomIn} title="Zoom in">+</button>
                    <button className={styles.zoomButton} onClick={handleZoomReset} title="Reset zoom">⟲</button>
                </div>
            </div>

            <div className={styles.chartWrapper}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={zoomedData}
                        margin={{
                            top: 5,
                            right: 30,
                            left: 20,
                            bottom: 5,
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis unit="%" tickFormatter={(value) => `${value}%`} />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#666', strokeWidth: 1, strokeDasharray: '5 5' }} />
                        <Legend onClick={handleLegendClick} />
                        {data.variations.map((variation, index) => (
                            <Line
                                key={variation.name}
                                type="monotone"
                                dataKey={variation.name}
                                stroke={colors[index % colors.length]}
                                activeDot={{ r: 8 }}
                                hide={!visibleVariations.has(variation.name)}
                                connectNulls={true}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default ConversionChart;

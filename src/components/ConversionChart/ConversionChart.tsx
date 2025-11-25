import React, { useMemo, useState } from 'react';
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

    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

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
                            <div key={index} className={styles.tooltipItem} style={{ color: entry.color }}>
                                <div className={styles.tooltipLabel}>{variationName}</div>
                                <div>Rate: {details.rate}%</div>
                                <div>Visits: {details.visits}</div>
                                <div>Conversions: {details.conversions}</div>
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
            <h2 className={styles.title}>Conversion Rate by Variation</h2>

            <div className={styles.controlsContainer}>
                <div className={styles.controlGroup}>
                    <span className={styles.label}>View:</span>
                    <select
                        className={styles.select}
                        value={viewMode}
                        onChange={(e) => setViewMode(e.target.value as 'day' | 'week')}
                    >
                        <option value="day">Daily</option>
                        <option value="week">Weekly</option>
                    </select>
                </div>

                <div className={styles.controlGroup}>
                    <span className={styles.label}>Variations:</span>
                    <div className={styles.checkboxGroup}>
                        {data.variations.map((variation, index) => (
                            <label key={variation.name} className={styles.checkboxLabel}>
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
                </div>
            </div>

            <div className={styles.chartWrapper}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={filteredData}
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

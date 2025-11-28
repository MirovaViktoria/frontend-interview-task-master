import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
    ComposedChart,
    Line,
    Area,
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
    const [lineStyle, setLineStyle] = useState<'curve' | 'area' | 'shadow' | 'straight'>('curve');
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const variationDropdownRef = useRef<HTMLDivElement>(null);

    // Load saved theme from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('chart-theme') as 'light' | 'dark' | null;
        if (saved) {
            setTheme(saved);
        }
    }, []);

    // Persist theme changes
    useEffect(() => {
        localStorage.setItem('chart-theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
    };

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

    const colors = ['#5E5D67', '#FF8346', '#ff1a1a', '#3838E7'];

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

    const getInterpolatedValue = (data: any[], index: number, key: string) => {
        // Search backwards
        let prevIndex = -1;
        for (let i = index - 1; i >= 0; i--) {
            if (data[i][key] !== null && data[i][key] !== undefined) {
                prevIndex = i;
                break;
            }
        }
        // Search forwards
        let nextIndex = -1;
        for (let i = index + 1; i < data.length; i++) {
            if (data[i][key] !== null && data[i][key] !== undefined) {
                nextIndex = i;
                break;
            }
        }

        if (prevIndex !== -1 && nextIndex !== -1) {
            const prevValue = data[prevIndex][key];
            const nextValue = data[nextIndex][key];
            const progress = (index - prevIndex) / (nextIndex - prevIndex);
            return prevValue + (nextValue - prevValue) * progress;
        }
        return null;
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            // Format date to DD/MM/YYYY
            const dateObj = new Date(label);
            const formattedDate = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;

            const currentIndex = chartData.findIndex(item => item.date === label);
            const tooltipItems: any[] = [];

            visibleVariations.forEach((variationName) => {
                const variationIndex = data.variations.findIndex(v => v.name === variationName);
                const color = colors[variationIndex % colors.length];
                let rate: number | null = null;

                // Try to find in payload first
                const payloadItem = payload.find((p: any) => p.name === variationName);
                if (payloadItem && payloadItem.payload[`${variationName}_details`]) {
                    rate = payloadItem.payload[`${variationName}_details`].rate;
                } else if (currentIndex !== -1) {
                    // Check if value exists in data but was dropped by Recharts (unlikely but possible)
                    const val = chartData[currentIndex][variationName];
                    if (val !== null && val !== undefined) {
                        rate = val;
                    } else {
                        // Interpolate
                        rate = getInterpolatedValue(chartData, currentIndex, variationName);
                    }
                }

                if (rate !== null) {
                    tooltipItems.push({
                        name: variationName,
                        color,
                        rate
                    });
                }
            });

            // Sort tooltip items by value (rate) descending
            tooltipItems.sort((a, b) => b.rate - a.rate);

            // Find max rate to determine winner
            const maxRate = tooltipItems.length > 0 ? tooltipItems[0].rate : 0;

            return (
                <div className={styles.tooltip}>
                    <div className={styles.dateContainer}>
                        <img src="calendar.svg" alt="Calendar" />
                        <p className={styles.tooltipDate}>{formattedDate}</p>
                    </div>
                    {tooltipItems.map((entry: any, index: number) => {
                        const isWinner = entry.rate === maxRate && maxRate > 0;

                        return (
                            <div key={index} className={styles.tooltipItem}>
                                <div className={styles.tooltipRow}>
                                    <div className={styles.tooltipLeft}>
                                        <span className={styles.tooltipBullet} style={{ backgroundColor: entry.color }}></span>
                                        <span className={styles.tooltipLabel}>{entry.name}</span>
                                        {isWinner && (
                                            <span className={styles.trophyIcon} title="Winner">
                                                <img src="generalbest.svg" alt="Winner" width="12" height="12" />
                                            </span>
                                        )}
                                    </div>
                                    <span className={styles.tooltipValue}>{entry.rate.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</span>
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
        <div className={styles.container} data-theme={theme}>

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
                            <option value="month">Month</option>
                            <option value="year">Year</option>
                        </select>
                    </div>
                </div>

                <div className={styles.zoomControls}>
                    <button
                        className={styles.themeToggle}
                        onClick={toggleTheme}
                        title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
                    >
                        {theme === 'light' ? '🌙' : '☀️'}
                    </button>
                    <span className={styles.label}>Line style:</span>
                    <select
                        className={styles.select}
                        value={lineStyle}
                        onChange={(e) => setLineStyle(e.target.value as 'curve' | 'area' | 'shadow' | 'straight')}
                    >
                        <option value="curve">Curve</option>
                        <option value="area">Area</option>
                        <option value="shadow">Shadow</option>
                        <option value="straight">Straight</option>
                    </select>
                    <button className={styles.zoomButton} onClick={handleZoomOut} title="Zoom out">−</button>
                    <button className={styles.zoomButton} onClick={handleZoomIn} title="Zoom in">+</button>
                    <button className={styles.zoomButton} onClick={handleZoomReset} title="Reset zoom">⟲</button>
                </div>
            </div>

            <div className={styles.chartWrapper}>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                        data={zoomedData}
                        margin={{
                            top: 5,
                            right: 30,
                            left: 20,
                            bottom: 5,
                        }}
                    >
                        <defs>
                            {data.variations.map((variation, index) => {
                                const gradientId = `gradient-${variation.name.replace(/\s+/g, '-')}`;
                                return (
                                    <linearGradient key={gradientId} id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={colors[index % colors.length]} stopOpacity={0.5} />
                                        <stop offset="95%" stopColor={colors[index % colors.length]} stopOpacity={0} />
                                    </linearGradient>
                                );
                            })}
                        </defs>
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke={theme === 'dark' ? '#1a1f3a' : '#f0f0f0'}
                        />
                        <XAxis
                            tick={{ dy: 8 }}
                            dataKey="date"
                            stroke={theme === 'dark' ? '#a0a0a0' : '#666'}
                        />
                        <YAxis unit="%" tickFormatter={(value) => `${value}`}
                            stroke={theme === 'dark' ? '#a0a0a0' : '#666'} />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#666', strokeWidth: 1, strokeDasharray: '5 5' }} />
                        <Legend onClick={handleLegendClick} />
                        {data.variations.map((variation, index) => {
                            if (!visibleVariations.has(variation.name)) return null;

                            const color = colors[index % colors.length];
                            const commonProps = {
                                key: variation.name,
                                dataKey: variation.name,
                                stroke: color,
                                activeDot: { r: 8 },
                                connectNulls: true,
                            };

                            if (lineStyle === 'area') {
                                const gradientId = `gradient-${variation.name.replace(/\s+/g, '-')}`;
                                return (
                                    <Area
                                        {...commonProps}
                                        type="monotone"
                                        fill={`url(#${gradientId})`}
                                        fillOpacity={1}
                                    />
                                );
                            }

                            return (
                                <React.Fragment key={variation.name}>
                                    {lineStyle === 'shadow' && (
                                        <Line
                                            {...commonProps}
                                            key={`${variation.name}-shadow`}
                                            type="monotone"
                                            strokeWidth={10}
                                            strokeOpacity={0.2}
                                            dot={false}
                                            activeDot={false}
                                            legendType="none"
                                            tooltipType="none"
                                        />
                                    )}
                                    <Line
                                        {...commonProps}
                                        type={lineStyle === 'curve' ? 'monotone' : lineStyle === 'straight' ? 'linear' : 'monotone'}
                                        dot={false}
                                        strokeWidth={2}
                                    />
                                </React.Fragment>
                            );
                        })}
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default ConversionChart;

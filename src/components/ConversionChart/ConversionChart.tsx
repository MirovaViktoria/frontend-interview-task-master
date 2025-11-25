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

    const chartData = useMemo(() => {
        return data.data.map((day) => {
            const entry: any = { date: day.date };
            data.variations.forEach((variation) => {
                const id = variation.id?.toString() || '0'; // '0' for Original

                // If visits data is missing for this variation on this day, treat as null (no data)
                if (day.visits[id] === undefined) {
                    entry[variation.name] = null;
                    entry[`${variation.name}_details`] = null;
                    return;
                }

                const visits = day.visits[id];
                const conversions = day.conversions[id] || 0;
                const rate = visits > 0 ? (conversions / visits) * 100 : 0;

                // Store detailed data for tooltip
                entry[variation.name] = parseFloat(rate.toFixed(2));
                entry[`${variation.name}_details`] = {
                    visits,
                    conversions,
                    rate: parseFloat(rate.toFixed(2))
                };
            });
            return entry;
        });
    }, []);

    // Filter data to only include dates where at least one VISIBLE variation has data
    const filteredData = useMemo(() => {
        return chartData.filter(entry => {
            return Array.from(visibleVariations).some(name => entry[name] !== null && entry[name] !== undefined);
        });
    }, [chartData, visibleVariations]);

    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

    const handleLegendClick = (e: any) => {
        const { value } = e;
        setVisibleVariations((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(value)) {
                if (newSet.size > 1) {
                    newSet.delete(value);
                }
            } else {
                newSet.add(value);
            }
            return newSet;
        });
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
                        <YAxis unit="%" />
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

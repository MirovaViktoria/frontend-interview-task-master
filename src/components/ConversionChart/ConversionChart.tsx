import React, { useMemo } from 'react';
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
    const chartData = useMemo(() => {
        return data.data.map((day) => {
            const entry: any = { date: day.date };
            data.variations.forEach((variation) => {
                const id = variation.id?.toString() || '0'; // '0' for Original
                const visits = day.visits[id] || 0;
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

    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className={styles.tooltip}>
                    <p className={styles.tooltipDate}>{label}</p>
                    {payload.map((entry: any, index: number) => {
                        const variationName = entry.name;
                        const details = entry.payload[`${variationName}_details`];
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
                        data={chartData}
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
                        <Legend />
                        {data.variations.map((variation, index) => (
                            <Line
                                key={variation.name}
                                type="monotone"
                                dataKey={variation.name}
                                stroke={colors[index % colors.length]}
                                activeDot={{ r: 8 }}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default ConversionChart;

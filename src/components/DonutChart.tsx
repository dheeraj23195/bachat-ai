import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, { G, Circle } from "react-native-svg";

export type DonutChartDataPoint = {
  value: number;
  color: string;
};

type DonutChartProps = {
  data: DonutChartDataPoint[];
  size?: number;
  strokeWidth?: number;
  /** Called when a segment is pressed/held */
  onSegmentPress?: (index: number) => void;
};

const DonutChart: React.FC<DonutChartProps> = ({
  data,
  size = 180,
  strokeWidth = 28,
  onSegmentPress,
}) => {
  if (!data || data.length === 0) {
    return null;
  }

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = data.reduce((sum, s) => sum + s.value, 0);

  let cumulativeOffset = 0;

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        <G rotation={-90} originX={size / 2} originY={size / 2}>
          {/* Background ring */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#EEF1F4"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {data.map((segment, index) => {
            const segmentLength = (segment.value / total) * circumference;
            const dashArray = [segmentLength, circumference - segmentLength];

            const circle = (
              <Circle
                key={index}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={segment.color}
                strokeWidth={strokeWidth}
                strokeDasharray={dashArray.join(" ")}
                strokeDashoffset={-cumulativeOffset}
                strokeLinecap="round"
                fill="transparent"
                // Fires on tap / press & hold
                onPressIn={
                  onSegmentPress
                    ? () => onSegmentPress(index)
                    : undefined
                }
              />
            );

            cumulativeOffset += segmentLength;
            return circle;
          })}
        </G>
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});

export default DonutChart;
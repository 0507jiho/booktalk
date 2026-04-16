import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Props = {
  proCount: number;
  conCount: number;
  neutralCount?: number;
  answerCount?: number; // 전체 답변 수 (투표 수와 별도 표시)
  mini?: boolean;
};

export default function StanceProgressBar({
  proCount,
  conCount,
  neutralCount = 0,
  answerCount,
  mini = false,
}: Props) {
  const voteTotal = proCount + conCount + neutralCount;

  if (mini) {
    const proRatio = voteTotal === 0 ? 1 / 3 : proCount / voteTotal;
    const neutralRatio = voteTotal === 0 ? 1 / 3 : neutralCount / voteTotal;
    const conRatio = voteTotal === 0 ? 1 / 3 : conCount / voteTotal;
    return (
      <View style={styles.miniContainer}>
        <Text style={styles.miniLabelPro}>찬 {proCount}</Text>
        <View style={styles.miniBar}>
          <View style={[styles.miniPro, { flex: proRatio }]} />
          <View style={[styles.miniNeutral, { flex: neutralRatio }]} />
          <View style={[styles.miniCon, { flex: conRatio }]} />
        </View>
        <Text style={styles.miniLabelCon}>반 {conCount}</Text>
      </View>
    );
  }

  const proPercent = voteTotal === 0 ? 0 : Math.round((proCount / voteTotal) * 100);
  const conPercent = voteTotal === 0 ? 0 : Math.round((conCount / voteTotal) * 100);
  const neutralPercent = voteTotal === 0 ? 0 : 100 - proPercent - conPercent;

  const proFlex = voteTotal === 0 ? 1 : proCount;
  const conFlex = voteTotal === 0 ? 1 : conCount;
  const neutralFlex = voteTotal === 0 ? 1 : neutralCount;

  return (
    <View style={styles.container}>
      {/* 퍼센트 레이블 */}
      <View style={styles.labelRow}>
        <Text style={styles.proLabel}>찬성 {proPercent}%</Text>
        {neutralCount > 0 && (
          <Text style={styles.neutralLabel}>중립 {neutralPercent}%</Text>
        )}
        <Text style={styles.conLabel}>반대 {conPercent}%</Text>
      </View>

      {/* 3단 바 */}
      <View style={styles.bar}>
        <View style={[styles.proPart, { flex: proFlex }]} />
        {neutralCount > 0 && <View style={[styles.neutralPart, { flex: neutralFlex }]} />}
        <View style={[styles.conPart, { flex: conFlex }]} />
      </View>

      {/* 투표 수 + 답변 수 */}
      <View style={styles.countRow}>
        <View style={styles.voteStat}>
          <Text style={styles.proCount}>👍 {proCount}명</Text>
          {neutralCount > 0 && <Text style={styles.neutralCount}>— {neutralCount}명</Text>}
          <Text style={styles.conCount}>{conCount}명 👎</Text>
        </View>
        <View style={styles.totalStats}>
          <Text style={styles.totalVote}>투표 {voteTotal}명</Text>
          {answerCount !== undefined && (
            <Text style={styles.totalAnswer}>답변 {answerCount}개</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },

  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  proLabel: { fontSize: 13, fontWeight: '700', color: '#27AE60' },
  neutralLabel: { fontSize: 12, color: '#7F8C8D' },
  conLabel: { fontSize: 13, fontWeight: '700', color: '#E74C3C' },

  bar: {
    height: 10,
    borderRadius: 5,
    flexDirection: 'row',
    overflow: 'hidden',
    backgroundColor: '#F0F0F0',
  },
  proPart: { backgroundColor: '#27AE60', minWidth: 4 },
  neutralPart: { backgroundColor: '#BDC3C7', minWidth: 4 },
  conPart: { backgroundColor: '#E74C3C', minWidth: 4 },

  countRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 6,
  },
  voteStat: { flexDirection: 'row', gap: 10 },
  proCount: { fontSize: 12, color: '#27AE60' },
  neutralCount: { fontSize: 12, color: '#7F8C8D' },
  conCount: { fontSize: 12, color: '#E74C3C' },
  totalStats: { alignItems: 'flex-end', gap: 2 },
  totalVote: { fontSize: 11, color: '#9E9E9E' },
  totalAnswer: { fontSize: 11, color: '#9E9E9E' },

  // Mini
  miniContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  miniBar: {
    flex: 1, height: 6, borderRadius: 3,
    flexDirection: 'row', overflow: 'hidden', backgroundColor: '#F0F0F0',
  },
  miniPro: { backgroundColor: '#27AE60', minWidth: 2 },
  miniNeutral: { backgroundColor: '#BDC3C7', minWidth: 2 },
  miniCon: { backgroundColor: '#E74C3C', minWidth: 2 },
  miniLabelPro: { fontSize: 11, color: '#27AE60', width: 36 },
  miniLabelCon: { fontSize: 11, color: '#E74C3C', width: 36, textAlign: 'right' },
});

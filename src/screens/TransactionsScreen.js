import React from 'react';
import { SectionList, StyleSheet, View } from 'react-native';
import { Appbar, List, Text, Divider, useTheme, Button } from 'react-native-paper';

const DATA = [
  {
    title: 'January 2026',
    data: ['item one', 'item two', 'item three', 'item four'],
    summary: { income: '10000000', expense: '1', balance: '9999999' },
  },
  {
    title: 'February 2026',
    data: ['item one', 'item two', 'item three', 'item four'],
    summary: { income: '10000000', expense: '1', balance: '9999999' },
  },
];

const TransactionsScreen = () => {
  const theme = useTheme();

  const renderSectionHeader = ({ section: { title } }) => (
    <List.Subheader style={[styles.sectionHeader, { color: theme.colors.primary }]}>
      {title}
    </List.Subheader>
  );

  const renderItem = ({ item }) => (
    <List.Item
      title={item}
      left={(props) => <List.Icon {...props} icon="circle-small" />}
      style={styles.item}
    />
  );

  const renderSectionFooter = ({ section: { summary } }) => (
    <View style={styles.summaryContainer}>
      <Text variant="bodySmall" style={styles.summaryText}>
        income - {summary.income}
      </Text>
      <Text variant="bodySmall" style={styles.summaryText}>
        expense - {summary.expense}
      </Text>
      <Text variant="bodySmall" style={styles.summaryText}>
        balance - {summary.balance}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Appbar.Header mode="center-aligned" elevated>
        <Appbar.Content title="Recent Transactions" />
        <Button mode="text" onPress={() => {}}>See All</Button>
      </Appbar.Header>
      
      <SectionList
        sections={DATA}
        keyExtractor={(item, index) => item + index}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        renderSectionFooter={renderSectionFooter}
        ItemSeparatorComponent={Divider}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  sectionHeader: {
    fontWeight: 'bold',
    fontSize: 16,
    backgroundColor: '#fff',
  },
  item: {
    paddingVertical: 0,
  },
  summaryContainer: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
    marginHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 12,
    color: '#555',
  },
  listContent: {
    paddingBottom: 20,
  }
});

export default TransactionsScreen;

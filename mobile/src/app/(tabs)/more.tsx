// More: the rest of Starlane's seven features, and the utilities.
import { router } from 'expo-router';
import { Card, Row, Screen, Section } from '../../components/ui';

export default function More() {
  return (
    <Screen title="More">
      <Section title="Features">
        <Card>
          <Row first title="Simulate" sub="What is likely to come in, and what if" onPress={() => router.push('/simulate')} />
          <Row title="Memory" sub="What Starlane learned, and where from" onPress={() => router.push('/memory')} />
          <Row title="Prepared" sub="The next 24 hours, 7 days and 30 days" onPress={() => router.push('/prepared')} />
        </Card>
      </Section>
      <Section title="Utilities">
        <Card>
          <Row first title="Sources" sub="Tally and other connections" onPress={() => router.push('/sources')} />
          <Row title="Settings" sub="Devices, notifications, sign out" onPress={() => router.push('/settings')} />
        </Card>
      </Section>
    </Screen>
  );
}

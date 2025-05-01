import React, { useEffect } from "react";
import styled from "styled-components";

import "@fontsource/roboto";
import {
  PageContainer,
  Title,
  Section,
  Subtitle,
  Paragraph,
  List,
  ListItem,
  StyledTable,
  StyledTh,
  StyledTd,
  Button,
  ButtonsContainer,
} from "../PageComponents";

const HousePricePredictor = () => {
  const openInNewTab = () => {
    window.open(`/projects/tributary`, "_blank");
  };

  return (
    <PageContainer>
      <Title>House price and type predictor (Python Scikit ML)</Title>
      <ButtonsContainer>
        <a href="https://github.com/rogertruong7/tributary_api" target="_blank">
          <Button>View Repo</Button>
        </a>
        <Button onClick={openInNewTab}>Open in new tab</Button>
      </ButtonsContainer>
      <Section>
        <Subtitle>Overview</Subtitle>
        <Paragraph>
          The Tributary API project is a framework designed to implement
          Event-Driven Architecture (EDA). It enables producers and consumers to
          interact asynchronously through logically grouped topics, partitions,
          and messages. This framework allows for scalable and efficient
          message-driven systems.
        </Paragraph>
      </Section>

      <Section>
        <Subtitle>Functionality</Subtitle>
        <Paragraph>
          The fundamental premise of the Tributary API is to facilitate
          communication between producers and consumers via:
        </Paragraph>
        <List>
          <ListItem>
            <strong>Topics:</strong> Logical groupings of events, similar to
            database tables or file system folders.
          </ListItem>
          <ListItem>
            <strong>Partitions:</strong> Queues within topics where events are
            appended sequentially.
          </ListItem>
          <ListItem>
            <strong>Messages:</strong> Units of data with headers, optional
            keys, and payloads.
          </ListItem>
        </List>
      </Section>

      <Section>
        <Subtitle>Features</Subtitle>
        <Paragraph>The Tributary API offers the following features:</Paragraph>
        <List>
          <ListItem>
            Support for both <strong>Random</strong> and <strong>Manual</strong>{" "}
            message allocation methods.
          </ListItem>
          <ListItem>
            Parameterised topics to handle generic event payloads.
          </ListItem>
          <ListItem>
            Consumer groups to manage message consumption across partitions.
          </ListItem>
          <ListItem>
            Dynamic rebalancing strategies: <strong>Range</strong>.
          </ListItem>
        </List>
      </Section>

      <Section>
        <Subtitle>Message Lifecycle</Subtitle>
        <Paragraph>
          When a producer generates an event, it is assigned to a topic and
          appended to one of its partitions. Consumers process these events in
          sequential order. Messages may be allocated to partitions randomly or
          based on a key provided by the producer.
        </Paragraph>
      </Section>
      <Section>
        <Subtitle>Rebalancing Strategies</Subtitle>
        <Paragraph>
          The Tributary API supports two rebalancing strategies:
        </Paragraph>
        <List>
          <ListItem>
            <strong>Range:</strong> Partitions are evenly divided among
            consumers, with any extra partitions assigned to the first consumer.
          </ListItem>
        </List>
      </Section>
      <Section>
        <Subtitle>CLI Commands</Subtitle>
        <Paragraph>
          The TributaryCLI provides a command-line interface for interacting
          with the Tributary system. Some key commands include:
        </Paragraph>
        <StyledTable>
          <tr>
            <StyledTh>
              <b>Command</b>
            </StyledTh>
            <StyledTh>
              <b>Description</b>
            </StyledTh>
            <StyledTh>
              <b>Output</b>
            </StyledTh>
          </tr>
          <tr>
            <StyledTd>
              <code>create topic &lt;id&gt; &lt;type&gt;</code>
            </StyledTd>
            <StyledTd>
              <ul>
                <li>Creates a new topic in the tributary.</li>
                <li>
                  <code>id</code> is the topic’s identifier.
                </li>
                <li>
                  <code>type</code> is the type of event that goes through the
                  topic. While this can be any type in Java, for the purposes of
                  the CLI it can either be <code>Integer</code> or{" "}
                  <code>String</code>.
                </li>
              </ul>
            </StyledTd>
            <StyledTd>
              A message showing the id, type and other relevant information
              about the topic confirming its creation.
            </StyledTd>
          </tr>
          <tr>
            <StyledTd>
              <code>create partition &lt;topic&gt; &lt;id&gt;</code>
            </StyledTd>
            <StyledTd>
              <ul>
                <li>
                  Creates a new partition in the topic with id{" "}
                  <code>topic</code>.
                </li>
                <li>
                  <code>id</code> is the partition’s identifier.
                </li>
              </ul>
            </StyledTd>
            <StyledTd>A message confirming the partition’s creation.</StyledTd>
          </tr>
          <tr>
            <StyledTd>
              <code>
                create consumer group &lt;id&gt; &lt;topic&gt;
                &lt;rebalancing&gt;
              </code>
            </StyledTd>
            <StyledTd>
              <ul>
                <li>Creates a new consumer group with the given identifier.</li>
                <li>
                  <code>topic</code> is the topic the consumer group is
                  subscribed to.
                </li>
                <li>
                  <code>rebalancing</code> is the consumer group’s initial
                  rebalancing method, one of <code>Range</code> or{" "}
                  <code>RoundRobin</code>.
                </li>
              </ul>
            </StyledTd>
            <StyledTd>
              A message confirming the consumer group’s creation.
            </StyledTd>
          </tr>
          <tr>
            <StyledTd>
              <code>create consumer &lt;group&gt; &lt;id&gt;</code>
            </StyledTd>
            <StyledTd>
              <ul>
                <li>Creates a new consumer within a consumer group.</li>
              </ul>
            </StyledTd>
            <StyledTd>A message confirming the consumer’s creation.</StyledTd>
          </tr>
          <tr>
            <StyledTd>
              <code>delete consumer &lt;consumer&gt;</code>
            </StyledTd>
            <StyledTd>
              <ul>
                <li>Deletes the consumer with the given id.</li>
              </ul>
            </StyledTd>
            <StyledTd>
              A message confirming the consumer’s deletion, and an output of the
              rebalanced consumer group that the consumer was previously in.
            </StyledTd>
          </tr>
          <tr>
            <StyledTd>
              <code>
                create producer &lt;id&gt; &lt;type&gt; &lt;allocation&gt;
              </code>
            </StyledTd>
            <StyledTd>
              <ul>
                <li>
                  Creates a new producer which produces events of the given
                  type.
                </li>
                <li>
                  <code>allocation</code> is either Random or Manual,
                  determining which method of partition selection is used for
                  publishing events.
                </li>
              </ul>
            </StyledTd>
            <StyledTd>A message confirming the producer’s creation.</StyledTd>
          </tr>
          <tr>
            <StyledTd>
              <code>
                produce event &lt;producer&gt; &lt;topic&gt; &lt;event&gt;
                &lt;partition&gt;
              </code>
            </StyledTd>
            <StyledTd>
              <ul>
                <li>
                  Produces a new event from the given producer to the given
                  topic.
                </li>
                <li>
                  How you represent the event is up to you. We recommend using a
                  JSON structure to represent the different parts of an event
                  and the
                  <code>event</code> parameter to this command is a filename to
                  a JSON file with the event content inside.
                </li>
                <li>
                  <code>partition</code> is an optional parameter used only if
                  the producer publishes events to a manually specified
                  partition which isn't stored inside the message structure
                </li>
              </ul>
            </StyledTd>
            <StyledTd>
              The event id, the id of the partition it is currently in.
            </StyledTd>
          </tr>
          <tr>
            <StyledTd>
              <code>consume event &lt;consumer&gt; &lt;partition&gt;</code>
            </StyledTd>
            <StyledTd>
              <ul>
                <li>
                  The given consumer consumes an event from the given partition.
                  Precondition: The consumer is already allocated to the given
                  partition.
                </li>
              </ul>
            </StyledTd>
            <StyledTd>
              The id and contents of the event, showing that the consumer has
              received the event.
            </StyledTd>
          </tr>
          <tr>
            <StyledTd>
              <code>
                consume events &lt;consumer&gt; &lt;partition&gt; &lt;number of
                events&gt;
              </code>
            </StyledTd>
            <StyledTd>
              <ul>
                <li>Consumes multiple events from the given partition.</li>
              </ul>
            </StyledTd>
            <StyledTd>
              The id and contents of each event received in order.
            </StyledTd>
          </tr>
          <tr>
            <StyledTd>
              <code>show topic &lt;topic&gt;</code>
            </StyledTd>
            <StyledTd></StyledTd>
            <StyledTd>
              Prints a visual display of the given topic, including all
              partitions and all of the events currently in each partition.
            </StyledTd>
          </tr>
          <tr>
            <StyledTd>
              <code>show consumer group &lt;group&gt;</code>
            </StyledTd>
            <StyledTd></StyledTd>
            <StyledTd>
              Shows all consumers in the consumer group, and which partitions
              each consumer is receiving events from.
            </StyledTd>
          </tr>
          <tr>
            <StyledTd>
              <code>
                parallel produce (&lt;producer&gt;, &lt;topic&gt;,
                &lt;event&gt;), ...
              </code>
            </StyledTd>
            <StyledTd>
              <ul>
                <li>
                  Produces a series of events in parallel. This is purely for
                  demonstrating that your tributary can cope with multiple
                  producers publishing events simultaneously.
                </li>
              </ul>
            </StyledTd>
            <StyledTd>
              For each event, the id of the partition it is currently in.
            </StyledTd>
          </tr>
          <tr>
            <StyledTd>
              <code>
                {" "}
                parallel consume (&lt;consumer&gt;, &lt;partition&gt;){" "}
              </code>
            </StyledTd>
            <StyledTd>
              <ul>
                <li>
                  Consumes a series of events in parallel. This is purely for
                  demonstrating that your tributary can cope with multiple
                  consumers receiving events simultaneously.
                </li>
              </ul>
            </StyledTd>
            <StyledTd>
              For each event consumed, the contents of the event and its id.
            </StyledTd>
          </tr>
          <tr>
            <StyledTd>
              <code>
                set consumer group rebalancing &lt;group&gt; &lt;rebalancing&gt;
              </code>
            </StyledTd>
            <StyledTd>
              <ul>
                <li>
                  Updates the rebalancing method of consumer group{" "}
                  <code>group</code> to be one of <code>Range</code> or{" "}
                  <code>RoundRobin</code>.
                </li>
              </ul>
            </StyledTd>
            <StyledTd>
              A message confirming the new rebalancing method.
            </StyledTd>
          </tr>
          <tr>
            <StyledTd>
              <code>
                playback &lt;consumer&gt; &lt;partition&gt; &lt;offset&gt;
              </code>
            </StyledTd>
            <StyledTd>
              <ul>
                <li>Plays back events for a given consumer from the offset.</li>
              </ul>
            </StyledTd>
            <StyledTd>
              The id and contents of each event received in order.
            </StyledTd>
          </tr>
        </StyledTable>
      </Section>
    </PageContainer>
  );
};

export default HousePricePredictor;

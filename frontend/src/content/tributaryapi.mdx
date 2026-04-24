## Overview

The Tributary API project is a framework designed to implement Event-Driven Architecture (EDA). It enables producers and consumers to interact asynchronously through logically grouped topics, partitions, and messages. This framework allows for scalable and efficient message-driven systems.

---

## Functionality

The fundamental premise of the Tributary API is to facilitate communication between producers and consumers via:

- **Topics:** Logical groupings of events, similar to database tables or file system folders.
- **Partitions:** Queues within topics where events are appended sequentially.
- **Messages:** Units of data with headers, optional keys, and payloads.

---

## Features

The Tributary API offers the following features:

- Support for both **Random** and **Manual** message allocation methods.
- Parameterised topics to handle generic event payloads.
- Consumer groups to manage message consumption across partitions.
- Dynamic rebalancing strategies: **Range**.

---

## Message Lifecycle

When a producer generates an event, it is assigned to a topic and appended to one of its partitions. Consumers process these events in sequential order. Messages may be allocated to partitions randomly or based on a key provided by the producer.

---

## Rebalancing Strategies

The Tributary API supports two rebalancing strategies:

- **Range:** Partitions are evenly divided among consumers, with any extra partitions assigned to the first consumer.

---

## CLI Commands

The TributaryCLI provides a command-line interface for interacting with the Tributary system. See the full table of commands, descriptions and outputs.
| Command                                            | Description                                                                                                                                                                                                                                                                                                   | Output                                                                                                   |
|----------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------|
| `create topic <id> <type>`                         | Creates a new topic in the tributary.`<id>` is the topic’s identifier.`<type>` is the type of event (Integer or String in the CLI).                                                                                                                             | A message confirming topic creation (shows id, type, etc.).                                             |
| `create partition <topic> <id>`                    | Creates a new partition in topic `<topic>`.`<id>` is the partition’s identifier.                                                                                                                                                                                  | A message confirming the partition’s creation.                                                           |
| `create consumer group <id> <topic> <rebalancing>` | Creates a new consumer group with identifier `<id>`.`<topic>` is the subscribed topic.`<rebalancing>` is the initial method (Range or RoundRobin).                                                                                                 | A message confirming the consumer group’s creation.                                                      |
| `create consumer <group> <id>`                     | Creates a new consumer within consumer group `<group>`.                                                                                                                                                                                                     | A message confirming the consumer’s creation.                                                            |
| `delete consumer <consumer>`                       | Deletes the consumer with identifier `<consumer>`.                                                                                                                                                                                                           | A message confirming deletion and showing the group’s new partition assignments.                        |
| `create producer <id> <type> <allocation>`         | Creates a new producer that emits events of type `<type>`.`<allocation>` is either Random or Manual.                                                                                                                                                     | A message confirming the producer’s creation.                                                            |
| `produce event <producer> <topic> <event> [partition]` | Produces an event from `<producer>` to `<topic>`.`<event>` is a JSON filename containing the payload.`[partition]` (optional) overrides partition selection.                                                                                       | The event id and its partition id.                                                                       |
| `consume event <consumer> <partition>`             | `<consumer>` consumes one event from `<partition>`.Precondition: consumer must be allocated to that partition.                                                                                                                                                | The event’s id and contents.                                                                             |
| `consume events <consumer> <partition> <n>`        | `<consumer>` consumes the next `<n>` events from `<partition>` in order.                                                                                                                                                                                      | The ids and contents of each event received.                                                             |
| `show topic <topic>`                               | Prints a visual display of `<topic>`, its partitions, and current events.                                                                                                                                                                                     | —                                                                                                        |
| `show consumer group <group>`                      | Shows all consumers in `<group>` and which partitions they’re consuming from.                                                                                                                                                                                 | —                                                                                                        |
| `parallel produce (<producer>, <topic>, <event>), …` | Produces multiple events in parallel to test concurrent publishing.                                                                                                                                                                                              | For each event: its id and partition id.                                                                 |
| `parallel consume (<consumer>, <partition>)`       | Consumes events in parallel to test concurrent consumption.                                                                                                                                                                                                  | For each event: its id and contents.                                                                     |
| `set consumer group rebalancing <group> <method>`  | Updates `<group>`’s rebalancing method to `Range` or `RoundRobin`.                                                                                                                                                                                              | A message confirming the updated rebalancing method.                                                     |
| `playback <consumer> <partition> <offset>`         | Replays events for `<consumer>` from the given `<offset>`.                                                                                                                                                                                                    | The ids and contents of each replayed event.                                                             |

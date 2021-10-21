import { Card, Elevation, Tag } from '@blueprintjs/core';
import React from 'react';
import { IOutputWIthMetadata } from '../src';

export function ResultLine(props: { outputLine: IOutputWIthMetadata<any[]> }): JSX.Element {
  const { outputLine } = props;
  return (
    <Card elevation={Elevation.TWO}>
      <p>{outputLine.value}</p>
      {outputLine.metadata?.map((metadata, index) => (
        <Tag key={index}>{JSON.stringify(metadata)}</Tag>
      ))}
    </Card>
  );
}

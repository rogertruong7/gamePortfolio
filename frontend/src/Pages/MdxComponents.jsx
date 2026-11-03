import styled from "styled-components";

const ink = "#14235A";
const inkSoft = "#46557F";
const crimson = "#A8123F";
const sakura = "#FFD9E2";
const pixel = '"Pixelify Sans", "Zen Kaku Gothic New", sans-serif';

const H2 = styled.h2`
  margin: 56px 0 14px;
  color: ${ink};
  font: 600 34px/1.15 ${pixel};

  &:first-child {
    margin-top: 0;
  }
`;

const H3 = styled.h3`
  margin: 32px 0 8px;
  color: ${ink};
  font-size: 20px;
  font-weight: 700;
  line-height: 1.35;
`;

const P = styled.p`
  margin: 0 0 16px;
  font-size: 17px;
  line-height: 1.72;
`;

const Ul = styled.ul`
  margin: 0 0 18px;
  padding-left: 22px;
  font-size: 17px;
  line-height: 1.65;

  li {
    margin-bottom: 7px;
    padding-left: 2px;
  }

  li::marker {
    color: ${crimson};
  }
`;

const A = styled.a`
  color: ${crimson};
  font-weight: 500;
  text-underline-offset: 3px;
`;

const Code = styled.code`
  padding: 1px 5px;
  background: ${sakura};
  color: ${ink};
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
  font-size: 0.86em;
`;

const Pre = styled.pre`
  margin: 0 0 18px;
  padding: 16px 18px;
  overflow-x: auto;
  background: ${ink};
  color: #fff;
  font-size: 14px;
  line-height: 1.55;

  code {
    padding: 0;
    background: none;
    color: inherit;
  }
`;

const TableScroll = styled.div`
  margin: 0 0 22px;
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 15px;
  line-height: 1.5;
`;

const Th = styled.th`
  padding: 8px 12px 8px 0;
  border-bottom: 3px solid ${ink};
  text-align: left;
  font-weight: 700;
`;

const Td = styled.td`
  padding: 9px 12px 9px 0;
  border-bottom: 1px solid #c9d6e8;
  vertical-align: top;
`;

const Quote = styled.blockquote`
  margin: 0 0 18px;
  padding-left: 16px;
  border-left: 4px solid ${crimson};
  color: ${inkSoft};
`;

export const mdxComponents = {
  h1: H2,
  h2: H2,
  h3: H3,
  h4: H3,
  p: P,
  ul: Ul,
  ol: (props) => <Ul as="ol" {...props} />,
  a: (props) => <A target="_blank" rel="noreferrer" {...props} />,
  code: Code,
  pre: Pre,
  blockquote: Quote,
  table: (props) => (
    <TableScroll>
      <Table {...props} />
    </TableScroll>
  ),
  th: Th,
  td: Td,
  hr: () => null,
};

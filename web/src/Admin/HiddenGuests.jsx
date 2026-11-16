import { useState } from "react";
import styled from "styled-components";
import { Button, color, ErrorText, LinkButton, Quiet, TextField } from "./theme.js";
import { plural, shortId } from "./format.js";

const describe = (exclusion) =>
  exclusion.kind === "ip" ? exclusion.value : `Guest ${shortId(exclusion.value)}`;

const HiddenGuests = ({ exclusions, yourIp, onHide, onUnhide, error }) => {
  const [ip, setIp] = useState("");
  const [label, setLabel] = useState("");
  const yourIpIsHidden = exclusions.some(
    (exclusion) => exclusion.kind === "ip" && exclusion.value === yourIp?.toLowerCase()
  );

  const submit = async (event) => {
    event.preventDefault();
    const added = await onHide("ip", ip, label);
    if (added) {
      setIp("");
      setLabel("");
    }
  };

  return (
    <div>
      <Quiet>
        Visits from these are left out of every number on this page. Un-hide one
        and its past visits come back.
      </Quiet>

      <Form onSubmit={submit}>
        <TextField
          aria-label="IP address to hide"
          placeholder="IP address"
          value={ip}
          required
          onChange={(event) => setIp(event.target.value)}
        />
        <TextField
          aria-label="Note"
          placeholder="Note, like ‘home wifi’"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
        />
        <Button type="submit">Hide IP</Button>
        {yourIp && !yourIpIsHidden && (
          <Button type="button" $active onClick={() => onHide("ip", yourIp, "My IP")}>
            Hide my IP ({yourIp})
          </Button>
        )}
      </Form>
      {error && <ErrorText role="alert">{error}</ErrorText>}

      {exclusions.length > 0 && (
        <List>
          {exclusions.map((exclusion) => (
            <Item key={`${exclusion.kind}:${exclusion.value}`}>
              <Value>{describe(exclusion)}</Value>
              <Meta>
                {[exclusion.label, plural(exclusion.sessions, "visit") + " hidden"]
                  .filter(Boolean)
                  .join(" · ")}
                {exclusion.kind === "ip" && exclusion.value === yourIp?.toLowerCase() &&
                  " · your current IP"}
              </Meta>
              <LinkButton type="button" onClick={() => onUnhide(exclusion)}>
                Un-hide
              </LinkButton>
            </Item>
          ))}
        </List>
      )}
    </div>
  );
};

const Form = styled.form`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;

  input {
    width: 200px;
  }
`;

const List = styled.ul`
  list-style: none;
  margin: 16px 0 0;
  padding: 0;
`;

const Item = styled.li`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 14px;
  padding: 8px 0;
  border-bottom: 1px solid ${color.line};
`;

const Value = styled.span`
  font-weight: 600;
  font-variant-numeric: tabular-nums;
`;

const Meta = styled.span`
  flex: 1;
  font-size: 0.875rem;
  color: ${color.muted};
`;

export default HiddenGuests;

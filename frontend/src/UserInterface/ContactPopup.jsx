import { useState } from "react";
import styled from "styled-components";
import ChromeFrame, { chromeButton } from "./ChromeFrame.jsx";
import Modal, { body, crimson, focusBlue, ink, inkSoft } from "./Modal.jsx";

const EMAIL = "rogertruong7@gmail.com";
// Web3Forms emails each message to the address its key was made for. The key is meant to be
// public, so it's fine in the site's JavaScript, unlike the other variables in .env.
const ACCESS_KEY = import.meta.env.VITE_WEB3FORMS_ACCESS_KEY;
const ENDPOINT = "https://api.web3forms.com/submit";
const MAX_MESSAGE = 4000;

// A form that emails Roger, sent through Web3Forms so the site needs no server for it
const ContactPopup = ({ onClose }) => {
  const [status, setStatus] = useState("idle");

  async function send(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!ACCESS_KEY) {
      setStatus("error");
      return;
    }
    setStatus("sending");
    const fields = Object.fromEntries(new FormData(form));
    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: ACCESS_KEY,
          subject: `Portfolio message from ${fields.name}`,
          from_name: "Roger's portfolio",
          ...fields,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || response.statusText);
      form.reset();
      setStatus("sent");
    } catch (error) {
      console.error("The contact form couldn't send", error);
      setStatus("error");
    }
  }

  return (
    <Modal
      title="Contact"
      tagline="Send me a message and I'll get back to you."
      actionLabel="Close"
      onClose={onClose}
      closeOnBackdrop
    >
      {status === "sent" ? (
        <Note role="status">
          {"Thanks! Your message is on its way, and I'll reply to the email you gave."}
        </Note>
      ) : (
        <Form onSubmit={send}>
          <Field>
            <span>Name</span>
            <input name="name" autoComplete="name" required maxLength={100} />
          </Field>
          <Field>
            <span>Email</span>
            <input name="email" type="email" autoComplete="email" required maxLength={200} />
          </Field>
          <Field>
            <span>Message</span>
            <textarea name="message" rows={6} required maxLength={MAX_MESSAGE} />
          </Field>
          {/* Left empty by people and filled in by bots, which Web3Forms then ignores */}
          <Trap type="checkbox" name="botcheck" tabIndex={-1} autoComplete="off" aria-hidden="true" />
          {status === "error" && (
            <Note role="alert" $error>
              {"That didn't send. You can email me directly at "}
              <a href={`mailto:${EMAIL}`}>{EMAIL}</a>.
            </Note>
          )}
          <SendButton type="submit" disabled={status === "sending"}>
            {status === "sending" ? "Sending..." : "Send"}
            <ChromeFrame />
          </SendButton>
        </Form>
      )}
    </Modal>
  );
};

const Form = styled.form`
  display: grid;
  gap: 16px;
`;

const Field = styled.label`
  display: grid;
  gap: 6px;
  font-weight: 700;

  input,
  textarea {
    box-sizing: border-box;
    width: 100%;
    padding: 10px 12px;
    border: 2px solid rgba(20, 35, 90, 0.25);
    border-radius: 10px;
    background: white;
    color: ${ink};
    font: 500 16px / 1.4 ${body};
    resize: vertical;
  }

  input:focus,
  textarea:focus {
    border-color: ${focusBlue};
    outline: none;
  }
`;

// Off screen rather than hidden, since some bots skip fields that are display: none
const Trap = styled.input`
  position: absolute;
  left: -9999px;
`;

const Note = styled.p`
  margin: 0;
  color: ${({ $error }) => ($error ? crimson : inkSoft)};
  font-weight: 700;

  a {
    color: ${crimson};
  }
`;

const SendButton = styled.button`
  ${chromeButton}
  position: relative;
  justify-self: start;
  min-width: 140px;
  padding: 12px 24px;
  color: ${ink};
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    cursor: progress;
    opacity: 0.7;
  }
`;

export default ContactPopup;

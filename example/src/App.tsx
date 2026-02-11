import { Button } from "./components";
import { Card } from "./components";
import { Modal } from "./components";
import { useCounter } from "./hooks/useCounter";
import { useToggle } from "./hooks/useToggle";
import { formatDate, capitalize } from "./utils/string-utils";

/**
 * Main application component that demonstrates various UI components and hooks
 */
function App() {
  const [isModalOpen, toggleModal] = useToggle(false);
  const { count, increment, decrement, reset } = useCounter(0);

  return (
    <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <h1>Component Cat Example Application</h1>
      <p>
        Current date: {formatDate(new Date())} | Title:{" "}
        {capitalize("react catalog demo")}
      </p>

      <Card title="Counter Example" variant="primary">
        <p>Count: {count}</p>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Button onClick={increment} variant="primary">
            Increment
          </Button>
          <Button onClick={decrement} variant="secondary">
            Decrement
          </Button>
          <Button onClick={reset} variant="danger">
            Reset
          </Button>
        </div>
      </Card>

      <Card title="Modal Example" variant="secondary">
        <Button onClick={toggleModal} variant="primary">
          Open Modal
        </Button>
      </Card>

      <Modal isOpen={isModalOpen} onClose={toggleModal} title="Example Modal">
        <p>This is a modal dialog example.</p>
        <p>You can put any content here!</p>
      </Modal>
    </div>
  );
}

export default App;

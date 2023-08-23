import { screen } from "@testing-library/dom";
import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js";
import { ROUTES, ROUTES_PATH } from "../constants/routes.js";
import { fireEvent } from "@testing-library/dom";
import "@testing-library/jest-dom";
import mockStore from "../__mocks__/store";

describe("Given I am connected as an employee", () => {
  describe("When I am on NewBill Page", () => {
    let newBill;
    beforeEach(() => {
      const html = NewBillUI();
      document.body.innerHTML = html;
      window.localStorage.setItem(
        "user",
        JSON.stringify({ email: "test@email.com", type: "Employee" })
      );
      newBill = new NewBill({
        document,
        onNavigate: jest.fn(),
        store: mockStore,
        localStorage: window.localStorage,
      });
    });

    afterEach(() => {
      window.localStorage.removeItem("user");
    });

    test("Then I should see a form to submit a new bill", () => {
      expect(screen.getByTestId("form-new-bill")).toBeInTheDocument();
    });

    test("When I upload an invalid file type, an alert should be displayed", () => {
      window.alert = jest.fn();
      const fileInput = screen.getByTestId("file");
      const mockedFile = new File(["(⌐□_□)"], "test.txt", {
        type: "text/plain",
      });
      fireEvent.change(fileInput, { target: { files: [mockedFile] } });
      expect(window.alert).toHaveBeenCalledWith(
        "Extension de fichier non autorisée"
      );
    });

    test("When I submit the form, it should navigate to the Bills page", async () => {
      // Transformez onNavigate en mock function
      const onNavigate = jest.fn((pathname) => {
        document.body.innerHTML = ROUTES({ pathname });
      });

      const bill = new NewBill({
        document,
        onNavigate: onNavigate,
        store: mockStore,
        localStorage: window.localStorage,
      });

      // Mocking form input values and submitting the form
      fireEvent.input(screen.getByTestId("expense-type"), {
        target: { value: "Restaurant" },
      });
      fireEvent.input(screen.getByTestId("expense-name"), {
        target: { value: "Lunch" },
      });
      fireEvent.input(screen.getByTestId("amount"), {
        target: { value: "20" },
      });
      fireEvent.input(screen.getByTestId("vat"), { target: { value: "5" } });
      fireEvent.input(screen.getByTestId("datepicker"), {
        target: { value: "2023-08-01" },
      });
      fireEvent.input(screen.getByTestId("pct"), { target: { value: "10" } });
      fireEvent.input(screen.getByTestId("commentary"), {
        target: { value: "Business lunch" },
      });

      bill.fileUrl = "https://some-url.com";
      bill.fileName = "image.jpg";

      fireEvent.submit(screen.getByTestId("form-new-bill"));

      expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH["Bills"]);
    });
  });
});

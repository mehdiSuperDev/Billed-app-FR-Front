import { screen, waitFor } from "@testing-library/dom";
import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js";
import { ROUTES, ROUTES_PATH } from "../constants/routes.js";
import { fireEvent } from "@testing-library/dom";
import "@testing-library/jest-dom";
import mockStore from "../__mocks__/store";
import router from "../app/Router.js";

jest.mock("../app/store", () => mockStore);

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

    test("When I upload a valid file type, no alert should be displayed and file should be processed", async () => {
      window.alert = jest.fn();

      const fileInput = screen.getByTestId("file");
      const mockedFile = new File(["(⌐□_□)"], "test.jpg", {
        type: "image/jpeg",
      });

      fireEvent.change(fileInput, { target: { files: [mockedFile] } });

      await waitFor(() => {
        expect(window.alert).not.toHaveBeenCalled();
        expect(newBill.fileUrl).toBe("https://localhost:3456/images/test.jpg");
      });
    });
  });

  function testErrorHandling(errorCode) {
    return async () => {
      // Réinitialisation des mocks
      jest.clearAllMocks();

      // Configuration des spies et des mocks
      jest.spyOn(mockStore, "bills");
      jest.spyOn(console, "error").mockImplementation(() => {});

      Object.defineProperty(window, "localStorage", {
        value: window.localStorage,
      });

      Object.defineProperty(window, "location", {
        value: { hash: ROUTES_PATH["NewBill"] },
      });

      window.localStorage.setItem("user", JSON.stringify({ type: "Employee" }));
      $("body").empty().append('<div id="root"></div>');
      router();

      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname });
      };

      mockStore.bills = jest.fn().mockImplementation(() => {
        return {
          update: () => Promise.reject(new Error(`Erreur ${errorCode}`)),
          list: () => Promise.reject(new Error(`Erreur ${errorCode}`)),
        };
      });

      const newBill = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage,
      });

      const form = screen.getByTestId("form-new-bill");
      const handleSubmit = jest.fn((e) => newBill.handleSubmit(e));
      form.addEventListener("submit", handleSubmit);

      fireEvent.submit(form);
      await new Promise(process.nextTick);

      // Vérification que console.error a été appelé avec un objet Error contenant le bon message
      expect(console.error).toBeCalledWith(
        expect.objectContaining({
          message: expect.stringContaining(`Erreur ${errorCode}`),
        })
      );
    };
  }

  // Utilisation de la fonction pour créer des tests pour les codes d'erreur 500 et 404
  test(
    "fetches bills from mock API POST and handles 500 error",
    testErrorHandling(500)
  );
  test(
    "fetches bills from mock API POST and handles 404 error",
    testErrorHandling(404)
  );
});

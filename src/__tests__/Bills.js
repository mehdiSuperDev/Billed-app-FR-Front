/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom/extend-expect";
import { screen, waitFor } from "@testing-library/dom";
import BillsUI from "../views/BillsUI.js";
import { bills } from "../fixtures/bills.js";
import { ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store";
import router from "../app/Router.js";
import Bills from "../containers/Bills";

jest.mock("../app/store", () => mockStore);

jest.mock("../app/format.js", () => ({
  formatDate: jest.fn((date) => `formatted-${date}`),
  formatStatus: jest.fn((status) => `formatted-${status}`),
}));

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    test("Then bill icon in vertical layout should be highlighted", async () => {
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
        })
      );
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
      window.onNavigate(ROUTES_PATH.Bills);
      await waitFor(() => screen.getByTestId("icon-window"));
      const windowIcon = screen.getByTestId("icon-window");
      //to-do write expect expression
      expect(windowIcon.classList).toContain("active-icon");
    });
    test("Then bills should be ordered from earliest to latest", () => {
      document.body.innerHTML = BillsUI({ data: bills });
      const dates = screen
        .getAllByText(
          /^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i
        )
        .map((a) => a.innerHTML);
      const antiChrono = (a, b) => (a < b ? 1 : -1);
      const datesSorted = [...dates].sort(antiChrono);
      expect(dates).toEqual(datesSorted);
    });
  });
  describe("when i click on NewBill button", () => {
    test("Then, if i click on NewBill button, i will navigate to New Bill", () => {
      // Mock des dépendances
      const onNavigate = jest.fn();

      // Initialisation du composant testé
      const bills = new Bills({
        document: document,
        onNavigate,
        store: null,
        localStorage: window.localStorage,
      });

      // Appel de la méthode testée
      bills.handleClickNewBill();

      // Vérification
      expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH["NewBill"]);
    });
  });

  describe("when i fetch bills", () => {
    let bills;

    beforeEach(() => {
      bills = new Bills({
        document: document,
        onNavigate: jest.fn(),
        store: mockStore,
        localStorage: jest.fn(),
      });
    });

    it("does nothing if store is not defined", async () => {
      bills.store = null;
      expect(await bills.getBills()).toBeUndefined();
    });

    it("calls list() on this.store.bills()", async () => {
      const spy = jest.spyOn(mockStore.bills(), "list");
      await bills.getBills();
      expect(spy).toHaveBeenCalled();
    });

    it("formats the dates and statuses correctly", async () => {
      const snapshot = await mockStore.bills().list();
      const result = await bills.getBills();

      result.forEach((bill, index) => {
        const originalDate = snapshot[index].date;
        const originalStatus = snapshot[index].status;

        expect(bill.date).toBe(`formatted-${originalDate}`);
        expect(bill.status).toBe(`formatted-${originalStatus}`);
      });
    });

    it("returns the original date and formatted status when date formatting fails", async () => {
      const originalDate = "2001-01-01";
      const originalStatus = "pending";

      // Mocker formatDate pour lever une erreur
      jest
        .spyOn(require("../app/format"), "formatDate")
        .mockImplementationOnce(() => {
          throw new Error("Format date failed");
        });

      //  Creer un mock de donnees avec les valeurs voulues
      const mockBills = [
        {
          date: originalDate,
          status: originalStatus,
        },
      ];

      //Recupérer le mock de list() pour pouvoir le mocker
      const mockBillsList = mockStore.bills().list;
      // Mocker list() pour renvoyer les donnees mockées
      mockBillsList.mockResolvedValueOnce(mockBills);

      //Mocker formatStatus pour le formattage spécifique
      const doubleFormatMock = jest.fn((status) => `formatted-${status}`);

      jest
        .spyOn(require("../app/format"), "formatStatus")
        .mockImplementationOnce(doubleFormatMock);

      const bills = new Bills({
        document: document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage,
      });

      const result = await bills.getBills();

      const failedBill = result[0];

      expect(failedBill.date).toBe(originalDate);
      expect(failedBill.status).toBe(`formatted-${originalStatus}`);

      // Réinitialiser les mocks
      jest.restoreAllMocks();
    });
  });
});

describe("Given I am a user connected as Employee", () => {
  describe("When I navigate to Bill page", () => {
    test("fetches bills from mock API GET", async () => {
      localStorage.setItem(
        "user",
        JSON.stringify({ type: "Employee", email: "a@a" })
      );
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
      window.onNavigate(ROUTES_PATH.Bills);
      expect(screen.getByText("Mes notes de frais")).toBeTruthy();
    });
    describe("When an error occurs on API", () => {
      beforeEach(() => {
        jest.spyOn(mockStore, "bills");
        Object.defineProperty(window, "localStorage", {
          value: localStorageMock,
        });
        window.localStorage.setItem(
          "user",
          JSON.stringify({
            type: "Employee",
            email: "a@a",
          })
        );
        const root = document.createElement("div");
        root.setAttribute("id", "root");
        document.body.appendChild(root);
        router();
      });
      test("fetches bills from an API and fails with 404 message error", async () => {
        mockStore.bills.mockImplementationOnce(() => {
          return {
            list: () => {
              return Promise.reject(new Error("Erreur 404"));
            },
          };
        });
        window.onNavigate(ROUTES_PATH.Bills);
        await new Promise(process.nextTick);
        const message = await screen.getByText(/Erreur 404/);
        expect(message).toBeTruthy();
      });

      test("fetches messages from an API and fails with 500 message error", async () => {
        mockStore.bills.mockImplementationOnce(() => {
          return {
            list: () => {
              return Promise.reject(new Error("Erreur 500"));
            },
          };
        });

        window.onNavigate(ROUTES_PATH.Bills);
        await new Promise(process.nextTick);
        const message = await screen.getByText(/Erreur 500/);
        expect(message).toBeTruthy();
      });
    });
  });
});

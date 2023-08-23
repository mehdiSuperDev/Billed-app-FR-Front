/**
 * @jest-environment jsdom
 */

import { screen, waitFor } from "@testing-library/dom";
import BillsUI from "../views/BillsUI.js";
import { bills } from "../fixtures/bills.js";
import { ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";

import router from "../app/Router.js";

import Bills from "../containers/Bills.js";
import store from "../__mocks__/store";
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

  //Test d'intégration GET
  describe("Get Bills", () => {
    let bills;
    let mockedStore;

    beforeEach(() => {
      mockedStore = store;
      bills = new Bills({
        document: document,
        onNavigate: jest.fn(),
        store: mockedStore,
        localStorage: jest.fn(),
      });
    });

    describe("getBills()", () => {
      it("does nothing if store is not defined", async () => {
        bills.store = null;
        expect(await bills.getBills()).toBeUndefined();
      });

      it("calls list() on this.store.bills()", async () => {
        const spy = jest.spyOn(mockedStore.bills(), "list");
        await bills.getBills();
        expect(spy).toHaveBeenCalled();
      });

      it("formats the dates and statuses correctly", async () => {
        const snapshot = await store.bills().list();
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
        require("../app/format.js").formatDate.mockImplementationOnce(() => {
          throw new Error("Formatting failed");
        });
        const result = await bills.getBills();
        const failedBill = result.find((bill) => bill.date === originalDate);
        expect(failedBill.date).toBe(originalDate);
        expect(failedBill.status).toBe(`formatted-${failedBill.status}`);
      });
    });
  });
});

const {
  updateDocument,
  createDocument,
  getDocuments,
  getDocumentsWhere,
  deleteDocument,
} = require("../database/querys");

exports.getCodes = async (req, res) => {
  try {
    const codes = await getDocuments("codes");
    return res.status(200).send(codes);
  } catch (error) {
    console.log(error);
    throw new Error(error);
  }
};

exports.createCode = async (req, res) => {
  try {
    const body = req.body;

    // verify if the code exists
    const code = await getDocumentsWhere("codes", [{ field: "code", operator: "==", value: body.code }]);
    if (code.length > 0) {
      return res.status(401).send(`El codigo ${body.code} ya existe`);
    }

    const newCode = await createDocument("codes", { code: body.code, eduCoins: body.eduCoins, used: false });
    if (newCode) {
      return res.status(200).send(`Codigo ${body.code} creado con exito`);
    }

    return res.status(500).send("Error creando el codigo");
  } catch (error) {
    console.log(error);
    throw new Error(error);
  }
};

exports.claimCode = async (code, phoneNumber) => {
  try {
    const codeRef = await getDocumentsWhere("codes", [{ field: "code", operator: "==", value: code }]);
    if (codeRef.length === 0) {
      // code not found
      return false;
    }

    if (codeRef[0].used) {
      // code already used
      return false;
    }

    const user = await getDocumentsWhere("users", [{ field: "phoneNumber", operator: "==", value: phoneNumber }]);
    const newEduCoins = user[0].Attempts + codeRef[0].eduCoins;
    if (user.length === 0) {
      // user not found is new
      await createDocument("users", { phoneNumber, Attempts: codeRef[0].eduCoins });
    } else {
      await updateDocument("users", user[0].id, { Attempts: newEduCoins });
      await updateDocument("codes", codeRef[0].id, { phoneNumber: phoneNumber, used: true });

      return { newEduCoins: newEduCoins, eduCoins: codeRef[0].eduCoins };
    }
  } catch (error) {
    console.log(error);
    throw new Error(error);
  }
};

exports.deleteCode = async (req, res) => {
  try {
    const body = req.body;

    // verify if the code exists
    const code = await getDocumentsWhere("codes", [{ field: "code", operator: "==", value: body.code }]);
    if (code.length === 0) {
      return res.status(401).send(`El codigo ${body.code} no existe`);
    }

    await deleteDocument("codes", code[0].id);
    return res.status(200).send(`Codigo ${body.code} eliminado con exito`);
  } catch (error) {
    console.log(error);
    throw new Error(error);
  }
};

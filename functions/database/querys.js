const { db } = require("./config");

// getDocuments is a function that returns all the documents from a collection
const getDocuments = async (collection) => {
  const querySnapshot = await db.collection(collection).get();
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

// getDocument is a function that returns a document from a collection
const getDocument = async (collection, documentId) => {
  const docRef = db.collection(collection).doc(documentId);
  const doc = await docRef.get();
  if (doc.exists) {
    return { id: doc.id, ...doc.data() };
  } else {
    throw new Error("No such document!");
  }
};

// getDocumentsWhere is a function that returns all the documents from a collection that match with the conditions
const getDocumentsWhere = async (collection, conditions) => {
  try {
    if (!Array.isArray(conditions)) {
      throw new Error("Conditions must be an array");
    }

    let query = db.collection(collection);
    conditions.forEach((condition) => {
      query = query.where(condition.field, condition.operator, condition.value);
    });
    const querySnapshot = await query.get();
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.log("Error en getDocumentsWhere", error);
    throw new Error("Error en getDocumentsWhere", error);
  }
};

// createDocument is a function that creates a document in a collection
const createDocument = async (collection, data, documentId) => {
  try {
    console.log("CREATE DOCUMENT", collection, data, documentId);
    if (documentId) {
      await db
        .collection(collection)
        .doc(documentId)
        .set({ ...data, updatedAt: new Date(), createdAt: new Date() }); // The field createdAt and updatedAt are added with the server timestamp

      return documentId;
    } else {
      const docRef = await db.collection(collection).add({ ...data, updatedAt: new Date(), createdAt: new Date() }); // The field createdAt and updatedAt are added with the server timestamp
      return docRef.id;
    }
  } catch (error) {
    console.log("Error en createDocument", error);
    throw new Error("Error en createDocument", error);
  }
};

// updateDocument is a function that updates a document in a collection
const updateDocument = async (collection, documentId, data) => {
  // The field updatedAt is added with the server timestamp
  const docRef = db.collection(collection).doc(documentId);
  await docRef.update({ ...data, updatedAt: new Date() });
};

// deleteDocument is a function that deletes a document in a collection
const deleteDocument = async (collection, documentId) => {
  const docRef = db.collection(collection).doc(documentId);
  await docRef.delete();
};

module.exports = { getDocuments, getDocument, getDocumentsWhere, createDocument, updateDocument, deleteDocument };
